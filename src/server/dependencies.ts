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
import { RDSError } from "./errors";

const dependencies = new Set<string>();

type Metadata = {
  dependenciesHash: string;
  deps: { [name: string]: { needInterop: boolean } | undefined };
};
let metadata: Metadata | undefined;

export const addDependency = (dep: string) => {
  if (!dep.startsWith(RDS_VIRTUAL_PREFIX)) dependencies.add(dep);
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

  logger.startLine(
    "buildDependencies",
    colors.green("Bundling new dependencies: ") +
      colors.yellow(
        deps.length > 5
          ? `${deps.slice(0, 4).join(", ")} (...and ${deps.length - 4} more)`
          : deps.join(", "),
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
  url,
  depsImports,
  cssGenerator,
  getCSSBase,
}: {
  code: string;
  url: string;
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
    if (!depMetadata) {
      throw RDSError({
        message: `Unbundled dependency ${dep.source}`,
        file: url,
      });
    }
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
