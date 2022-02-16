import fs from "fs";
import { join } from "path";
import { build } from "esbuild";

import {
  cache,
  cacheDir,
  getHashedUrl,
  readCacheFile,
  readJSONSync,
  writeJSONSync,
} from "./utils";
import { colors } from "./colors";
import { log } from "./logger";
import { DEPENDENCY_PREFIX } from "./consts";
import { AnalyzedImport } from "./swc";
import { HMRWebSocket } from "./types";
import { dependenciesHash } from "./dependenciesHash";

const dependencies = new Set<string>();

const CURRENT_METADATA_VERSION = 1;
type Metadata = {
  version: number;
  dependenciesHash: string;
  deps: { [name: string]: { needInterop: boolean } };
};
let metadata: Metadata | undefined;

if (fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

let initialLoad = true;
let reBundlePromise: Promise<void> | undefined;

export const addDependency = (dep: string, ws: HMRWebSocket) => {
  if (dependencies.has(dep)) return;
  if (initialLoad) {
    dependencies.add(dep);
  } else if (!reBundlePromise) {
    reBundlePromise = buildDependencies().finally(() => {
      reBundlePromise = undefined;
      ws.send({ type: "reload" });
    });
  }
};

const metadataPath = join(cacheDir, "dependencies.json");

export const buildDependencies = async () => {
  const start = performance.now();
  initialLoad = false;
  const deps = Array.from(dependencies);
  if (fs.existsSync(metadataPath)) {
    metadata = readJSONSync<Metadata>(metadataPath);
    if (
      metadata.dependenciesHash === dependenciesHash &&
      metadata.version === CURRENT_METADATA_VERSION
    ) {
      const cacheSet = new Set(Object.keys(metadata.deps));
      if (cacheSet.size >= deps.length && deps.every((d) => cacheSet.has(d))) {
        log.debug(
          `Pre-bundling skipped in ${Math.round(performance.now() - start)}ms`,
        );
        return;
      }
    }
  }
  const listed = 5;
  const depsString = colors.yellow(
    deps.slice(0, listed).join(`\n  `) +
      (deps.length > listed ? `\n  (...and ${deps.length - listed} more)` : ""),
  );
  log.info(colors.green(`Pre-bundling dependencies:\n  ${depsString}`));
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
  metadata = { version: CURRENT_METADATA_VERSION, dependenciesHash, deps: {} };
  const output = result.metafile!["outputs"];
  for (const dep of deps) {
    const { exports } = output[join(cacheDir, getFileName(dep))];
    metadata.deps[dep] = {
      needInterop:
        exports.length === 0 ||
        (exports.length === 1 && exports[0] === "default"),
    };
  }
  writeJSONSync(metadataPath, metadata);
  log.info(`  ✔ Bundled in ${Math.round(performance.now() - start)}ms`);
};

export const transformDependenciesImports = async (
  code: string,
  depImports: AnalyzedImport[],
) => {
  for (const dep of depImports) {
    if (!metadata!.deps[dep.source]) {
      throw new Error(`Unbundled dependency ${dep.source}`);
    }
    const { needInterop } = metadata!.deps[dep.source];
    const hashedUrl = getHashedUrl(
      `${DEPENDENCY_PREFIX}/${dep.source}`,
      await getDependency(dep.source),
    );
    if (needInterop && dep.specifiers.length) {
      const defaultImportName = `__rds_${dep.source.replace(/[-@/]/g, "_")}`;
      code = code.replace(
        new RegExp(`import \{[^\}]+\}\\s+from\\s+['"](${dep.source})['"];`),
        `import ${defaultImportName} from "/${hashedUrl}";` +
          dep.specifiers
            .map((s) => `const ${s.local} = ${defaultImportName}["${s.name}"];`)
            .join(""),
      );
    } else {
      code = code.replace(
        new RegExp(`from\\s+['"](${dep.source})['"]`),
        `from "/${hashedUrl}"`,
      );
    }
  }
  return code;
};

export const getDependency = cache<string, Promise<string>>(
  "getDependency",
  async (dependency) => {
    if (dependency.endsWith(".js")) {
      return readCacheFile(dependency);
    } else if (dependencies.has(dependency)) {
      return readCacheFile(getFileName(dependency));
    } else {
      throw new Error(`Unbundled dependency ${dependency}`);
    }
  },
).get;

const getFileName = (dep: string) => `${dep.replaceAll("/", "_")}.js`;
