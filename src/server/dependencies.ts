import { statSync, readFileSync } from "fs";
import { join } from "path";
import { build } from "esbuild";

import {
  cache,
  cacheDir,
  getHash,
  getHashedUrl,
  impSourceToRegex,
  jsonCacheSync,
  lookup,
  readCacheFile,
} from "./utils";
import { colors } from "./colors";
import { logger } from "./logger";
import {
  DEPENDENCY_PREFIX,
  RDS_CSS_BASE,
  RDS_CSS_UTILS,
  RDS_VIRTUAL_PREFIX,
} from "./consts";
import { AnalyzedImport } from "./swc";
import { CSSGenerator } from "./css/generator";

const dependencies = new Set<string>();

type Metadata = {
  dependenciesHash: string;
  deps: { [name: string]: { needInterop: boolean } | undefined };
};
let metadata: Metadata | undefined;

const newDeps = new Set<string>();
let reBundleTimeoutId: number | undefined;
let reBundlePromise: Promise<void> | undefined;
let reReBundle = false;

export const addDependency = (
  dep: string,
  onReBundleComplete: (() => void) | undefined,
) => {
  if (dep.startsWith(RDS_VIRTUAL_PREFIX)) return;
  if (dependencies.has(dep)) return;
  dependencies.add(dep);
  if (onReBundleComplete) {
    newDeps.add(dep);
    queueReBundle(onReBundleComplete);
  }
};

const queueReBundle = (onReBundleComplete: () => void) => {
  if (reBundlePromise) {
    reReBundle = true;
    return;
  }
  if (reBundleTimeoutId) clearTimeout(reBundleTimeoutId);
  setTimeout(() => {
    reBundle(onReBundleComplete);
  }, 300);
};

const reBundle = (onComplete: () => void) => {
  reBundlePromise = buildDependencies(true).finally(() => {
    reBundlePromise = undefined;
    newDeps.clear();
    if (reReBundle) {
      reReBundle = false;
      reBundle(onComplete);
    } else {
      onComplete();
    }
  });
};

let dependenciesHash: string;
const initDependencyHash = () => {
  if (!dependenciesHash) {
    const lockPath = lookup([
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
    ]);
    if (!lockPath) {
      throw new Error(
        "Unable to find dependencies lockfile. This is required to ensure cache invalidation.",
      );
    }
    const patchesDir = lookup(["patches"]);
    dependenciesHash = getHash(
      readFileSync(lockPath, "utf-8") +
        (patchesDir ? statSync(patchesDir).mtimeMs.toString() : ""),
    );
  }
};

export const buildDependencies = async (isReBundle: boolean) => {
  const start = performance.now();
  initDependencyHash();
  const deps = Array.from(dependencies);
  const metadataCache = jsonCacheSync<Metadata>("dependencies", 1);
  metadata = metadataCache.read();
  if (metadata && !isReBundle) {
    if (metadata.dependenciesHash === dependenciesHash) {
      const cacheSet = new Set(Object.keys(metadata.deps));
      if (cacheSet.size >= deps.length && deps.every((d) => cacheSet.has(d))) {
        logger.debug(
          `Pre-bundling skipped in ${(performance.now() - start).toFixed(2)}ms`,
        );
        return;
      }
      logger.debug("Skipping dependencies cache (new used deps)");
    } else {
      logger.debug("Skipping dependencies cache (dependenciesHash change)");
    }
  }
  const listedDeps = isReBundle ? Array.from(newDeps) : deps;
  const depsString = colors.yellow(
    listedDeps.length > 5
      ? `${listedDeps.slice(0, 4).join(", ")} (...and ${
          listedDeps.length - 4
        } more)`
      : listedDeps.join(", "),
  );
  logger.startLine(
    "buildDependencies",
    colors.green(
      `${
        isReBundle ? "Bundling new" : "Pre-bundling"
      } dependencies: ${depsString}`,
    ),
  );
  const result = await build({
    entryPoints: deps,
    bundle: true,
    format: "esm",
    legalComments: "none",
    metafile: true,
    splitting: true,
    sourcemap: true,
    outdir: cacheDir,
  });
  // eslint-disable-next-line require-atomic-updates
  metadata = { dependenciesHash, deps: {} };
  const output = result.metafile.outputs;
  for (const dep of deps) {
    const { exports } = output[join(cacheDir, getFileName(dep))];
    metadata.deps[dep] = {
      needInterop:
        exports.length === 0 ||
        (exports.length === 1 && exports[0] === "default"),
    };
  }
  metadataCache.write(metadata);
  logger.endLine(
    "buildDependencies",
    `  ✔ Bundled in ${Math.round(performance.now() - start)}ms`,
  );
};

export const transformDependenciesImports = async ({
  code,
  depsImports,
  cssGenerator,
  getCSSBase,
}: {
  code: string;
  depsImports: AnalyzedImport[];
  cssGenerator: CSSGenerator;
  getCSSBase: () => Promise<string>;
}) => {
  for (const dep of depsImports) {
    if (dep.source.startsWith(RDS_VIRTUAL_PREFIX)) {
      if (dep.source === RDS_CSS_UTILS) {
        code = code.replace(
          new RegExp(`import${impSourceToRegex(dep.source)}`),
          `import "${cssGenerator.getHashedCSSUtilsUrl()}"`,
        );
        continue;
      }
      if (dep.source === RDS_CSS_BASE) {
        code = code.replace(
          new RegExp(`import${impSourceToRegex(dep.source)}`),
          `import "${getHashedUrl(RDS_CSS_BASE, await getCSSBase())}"`,
        );
        continue;
      }
      throw new Error(`Unhandled entry ${dep.source}`);
    }
    const depMetadata = metadata!.deps[dep.source];
    if (!depMetadata) throw new Error(`Unbundled dependency ${dep.source}`);
    const hashedUrl = getHashedUrl(
      `${DEPENDENCY_PREFIX}/${dep.source}`,
      await getDependencyCache.get(dep.source),
    );
    if (depMetadata.needInterop && dep.specifiers.length) {
      const defaultImportName = `__rds_${dep.source.replace(/[-@/]/g, "_")}`;
      code = code.replace(
        new RegExp(`import {[^}]+}\\s+from${impSourceToRegex(dep.source)}`),
        `import ${defaultImportName} from "${hashedUrl}";${dep.specifiers
          .map((s) => `const ${s.local} = ${defaultImportName}["${s.name}"]`)
          .join(";")}`,
      );
    } else {
      code = code.replace(
        new RegExp(`from${impSourceToRegex(dep.source)}`),
        `from "${hashedUrl}"`,
      );
    }
  }
  return code;
};

export const getDependencyCache = cache<Promise<string>>(
  "getDependency",
  async (dependency) =>
    dependency.endsWith(".js")
      ? readCacheFile(dependency)
      : readCacheFile(getFileName(dependency)),
);

const getFileName = (dep: string) => `${dep.replaceAll("/", "_")}.js`;
