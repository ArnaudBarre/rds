import { join } from "path";
import { build } from "esbuild";
import fs from "fs";

import {
  cache,
  cacheDir,
  getHash,
  getHashedUrl,
  jsonCacheSync,
  lookup,
  readCacheFile,
  readFileSync,
} from "./utils";
import { colors } from "./colors";
import { logger } from "./logger";
import { DEPENDENCY_PREFIX, RDS_CSS_UTILS, RDS_VIRTUAL_PREFIX } from "./consts";
import { AnalyzedImport } from "./swc";
import { CSSGenerator } from "./css/generator";

const dependencies = new Set<string>();

type Metadata = {
  dependenciesHash: string;
  deps: { [name: string]: { needInterop: boolean } | undefined };
};
let metadata: Metadata | undefined;
let reBundlePromise: Promise<void> | undefined;

export const addDependency = (
  dep: string,
  onNewDep: (() => void) | undefined,
) => {
  if (dep.startsWith(RDS_VIRTUAL_PREFIX)) return;
  if (dependencies.has(dep)) return;
  dependencies.add(dep);
  if (!onNewDep) return;
  if (!reBundlePromise) {
    reBundlePromise = buildDependencies().finally(() => {
      reBundlePromise = undefined;
      onNewDep();
    });
  }
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
      readFileSync(lockPath) +
        (patchesDir ? fs.statSync(patchesDir).mtimeMs.toString() : ""),
    );
  }
};

export const buildDependencies = async () => {
  const start = performance.now();
  initDependencyHash();
  const deps = Array.from(dependencies);
  const metadataCache = jsonCacheSync<Metadata>("dependencies", 1);
  metadata = metadataCache.read();
  if (metadata) {
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
  const listed = 5;
  const depsString = colors.yellow(
    deps.slice(0, listed).join("\n  ") +
      (deps.length > listed ? `\n  (...and ${deps.length - listed} more)` : ""),
  );
  logger.info(colors.green(`Pre-bundling dependencies:\n  ${depsString}`));
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
  logger.info(`  ✔ Bundled in ${Math.round(performance.now() - start)}ms`);
};

export const transformDependenciesImports = async ({
  code,
  depsImports,
  cssGenerator,
}: {
  code: string;
  depsImports: AnalyzedImport[];
  cssGenerator: CSSGenerator;
}) => {
  for (const dep of depsImports) {
    if (dep.source.startsWith(RDS_VIRTUAL_PREFIX)) {
      if (dep.source === RDS_CSS_UTILS) {
        code = code.replace(
          new RegExp(`import\\s+['"]${dep.source}['"]`),
          `import "${cssGenerator.getHashedCSSUtilsUrl()}"`,
        );
        continue;
      }
      throw new Error(`Unhandled entry ${dep.source}`);
    }
    const depMetadata = metadata!.deps[dep.source];
    if (!depMetadata) throw new Error(`Unbundled dependency ${dep.source}`);
    const hashedUrl = getHashedUrl(
      `${DEPENDENCY_PREFIX}/${dep.source}`,
      await getDependency(dep.source),
    );
    if (depMetadata.needInterop && dep.specifiers.length) {
      const defaultImportName = `__rds_${dep.source.replace(/[-@/]/g, "_")}`;
      code = code.replace(
        new RegExp(`import {[^}]+}\\s+from\\s+['"]${dep.source}['"];`),
        `import ${defaultImportName} from "${hashedUrl}";${dep.specifiers
          .map((s) => `const ${s.local} = ${defaultImportName}["${s.name}"];`)
          .join("")}`,
      );
    } else {
      code = code.replace(
        new RegExp(`from\\s+['"]${dep.source}['"]`),
        `from "${hashedUrl}"`,
      );
    }
  }
  return code;
};

export const getDependency = cache<Promise<string>>(
  "getDependency",
  async (dependency) => {
    if (dependency.endsWith(".js")) {
      return readCacheFile(dependency);
    } else if (dependencies.has(dependency)) {
      return readCacheFile(getFileName(dependency));
    }
    throw new Error(`Unbundled dependency ${dependency}`);
  },
).get;

const getFileName = (dep: string) => `${dep.replaceAll("/", "_")}.js`;
