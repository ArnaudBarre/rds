import { readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { build } from "esbuild";
import { getHash, jsonCache } from "@arnaud-barre/config-loader";

import { cache } from "./cache";
import { cacheDir, lookup, readCacheFile } from "./utils";
import { colors } from "./colors";
import { debugNow, logger } from "./logger";
import { RDSError } from "./errors";
import {
  DEPENDENCY_PREFIX,
  ESBUILD_MODULES_TARGET,
  RDS_PREFIX,
} from "./consts";

const dependencies = new Map<string, string>();

type Metadata = {
  dependenciesHash: string;
  deps: { [name: string]: { needInterop: boolean } | undefined };
};
let metadata: Metadata | undefined;

export const addDependency = (dep: string, fromUrl: string) => {
  if (dep.startsWith("virtual:") || dep.startsWith(RDS_PREFIX)) return;
  dependencies.set(dep, fromUrl);
};

let dependenciesHash: string;
const initDependencyHash = () => {
  if (!dependenciesHash) {
    const lockPath = lookup([
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
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

export const bundleDependencies = async () => {
  const start = performance.now();
  initDependencyHash();
  const deps = Array.from(dependencies.keys());
  const metadataCache = jsonCache<Metadata>(
    join(cacheDir, "dependencies.json"),
    1,
  );
  metadata = metadataCache.read();
  if (metadata) {
    if (metadata.dependenciesHash === dependenciesHash) {
      const cacheSet = new Set(Object.keys(metadata.deps));
      if (cacheSet.size >= deps.length && deps.every((d) => cacheSet.has(d))) {
        logger.debug(
          `Pre-bundling skipped in ${(debugNow() - start).toFixed(2)}ms`,
        );
        return;
      }
      logger.debug("Skipping dependencies cache (new used deps)");
    } else {
      logger.debug("Skipping dependencies cache (dependenciesHash change)");
    }
  }

  logger.startLine(
    "bundleDependencies",
    colors.green("Bundling dependencies: ") +
      colors.yellow(
        deps.length > 5
          ? `${deps.slice(0, 4).join(", ")} and ${deps.length - 4} more`
          : deps.join(", "),
      ),
  );

  const result = await build({
    entryPoints: deps,
    bundle: true,
    format: "esm",
    platform: "browser",
    legalComments: "none",
    metafile: true,
    splitting: true,
    sourcemap: true,
    target: ESBUILD_MODULES_TARGET, // TODO: Compute the min between this and config.target
    outdir: cacheDir,
    logLevel: "error",
  }).catch((err) => {
    const match = (err.message as string).match(/Could not resolve "(.*)"/);
    if (!match) throw err;
    throw new RDSError({
      message: `Could not resolve "${match[1]}"`,
      file: dependencies.get(match[1])!,
    });
  });
  // eslint-disable-next-line require-atomic-updates
  metadata = { dependenciesHash, deps: {} };
  const output = result.metafile.outputs;
  for (const dep of deps) {
    if (dep.endsWith(".css")) {
      metadata.deps[dep] = { needInterop: false };
    } else {
      const { exports } = output[join(cacheDir, `${dep}.js`)];
      metadata.deps[dep] = {
        needInterop:
          exports.length === 0 ||
          (exports.length === 1 && exports[0] === "default"),
      };
    }
  }
  metadataCache.write(metadata);
  logger.endLine(
    "bundleDependencies",
    `  ✔ Bundled in ${Math.round(performance.now() - start)}ms`,
  );
};

export const getDependencyMetadata = (dependency: string) =>
  metadata!.deps[dependency];

export const dependenciesCache = cache("dependencies", (dependency) => {
  if (dependency.endsWith(".css")) {
    let content = readCacheFile(dependency);
    const sourceMapIndex = content.indexOf("# sourceMappingURL=");
    if (sourceMapIndex !== -1) {
      const dotMapIndex = content.indexOf(".map", sourceMapIndex);
      if (dotMapIndex !== -1) {
        const path = content.slice(
          sourceMapIndex + "# sourceMappingURL=".length,
          dotMapIndex,
        );
        const updatedPath = join(dirname(dependency), path);
        content =
          // eslint-disable-next-line prefer-template
          content.slice(0, sourceMapIndex) +
          `# sourceMappingURL=/${DEPENDENCY_PREFIX}/${updatedPath}` +
          content.slice(dotMapIndex);
      }
    }
    return `const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.setAttribute("data-id", "${dependency}");
style.innerHTML = ${JSON.stringify(content)};
document.head.appendChild(style);
`;
  }
  return readCacheFile(
    dependency.endsWith(".js") ? dependency : `${dependency}.js`,
  );
});
