import fs from "fs";
import { join } from "path";
import { build } from "esbuild";

import { cache, cacheDir, getHashedUrl, readCacheFile } from "./utils";
import { colors } from "./colors";
import { log } from "./logger";
import { DEPENDENCY_PREFIX } from "./consts";
import { AnalyzedImport } from "./swc";

export const dependencies = new Set<string>();

if (fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

export const buildDependencies = async () => {
  const deps = Array.from(dependencies);
  const listed = 5;
  const depsString = colors.yellow(
    deps.slice(0, listed).join(`\n  `) +
      (deps.length > listed ? `\n  (...and ${deps.length - listed} more)` : ""),
  );
  log(colors.green(`Pre-bundling dependencies:\n  ${depsString}`));
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
  fs.writeFileSync(
    join(cacheDir, ".meta.json"),
    JSON.stringify(result.metafile!),
  );
};

export const transformDependenciesImports = async (
  code: string,
  depImports: AnalyzedImport[],
) => {
  for (const dep of depImports) {
    const isCjs = true;
    const hashedUrl = getHashedUrl(
      `${DEPENDENCY_PREFIX}/${dep.source}`,
      await getDependency(dep.source),
    );
    if (isCjs && dep.specifiers.length) {
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
  async (depName) => {
    if (depName.endsWith(".js")) {
      return readCacheFile(depName);
    } else if (dependencies.has(depName)) {
      return readCacheFile(`${depName.replaceAll("/", "_")}.js`);
    } else {
      throw new Error(`Unbundled dependency ${depName}`);
    }
  },
).get;
