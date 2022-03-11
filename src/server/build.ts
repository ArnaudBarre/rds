#!/usr/bin/env node
import { rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { build, BuildResult, Metafile } from "esbuild";
import { execSync } from "child_process";

import { svgToJSX } from "./svgToJSX";
import { colors } from "./colors";
import { getHash, readFile } from "./utils";
import { esbuildFilesLoaders } from "./mimeTypes";
import { isDebug } from "./logger";
import { initCSS } from "./css";
import { cssModuleToJS } from "./css/utils/hmr";
import { ENTRY_POINT } from "./consts";
import { parcel } from "./css/parcel";
import { stopProfiler } from "./stopProfiler";

const log = (step: string) => {
  if (!isDebug) return;
  console.log(
    `${colors.green(
      (performance.now() - global.__rds_start).toFixed(2),
    )} ${step}`,
  );
};

const CSS_UTILS_PLACEHOLDER = "/*! CSS_UTILS */";

const main = async () => {
  log("Load");
  rmSync("dist", { recursive: true, force: true });
  log("Clean dist");
  const { getCSSBase, cssPreTransform, cssGenerator } = await initCSS();
  log("Init CSS");
  const cssModulesMap: Record<string, string> = {};
  let hasCSSUtils = false;
  let bundleResult: BuildResult & { metafile: Metafile };
  try {
    bundleResult = await build({
      entryPoints: [ENTRY_POINT],
      bundle: true,
      outdir: "dist/assets",
      sourcemap: true,
      metafile: true,
      format: "esm",
      platform: "browser",
      target: ["safari13"],
      minify: true,
      legalComments: "inline", // Hack for injecting CSS utils at the right place
      inject: [join(__dirname, "inject.js")],
      publicPath: "/assets/",
      assetNames: "[name].[hash]",
      chunkNames: "[name].[hash]",
      entryNames: "[name].[hash]",
      loader: esbuildFilesLoaders,
      plugins: [
        {
          name: "css",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /^transpiled:/ }, ({ path }) => ({
              path: path.slice(11),
              namespace: "css-transpiled",
            }));
            pluginBuild.onLoad(
              { filter: /./, namespace: "css-transpiled" },
              ({ path }) => ({ contents: cssModulesMap[path], loader: "css" }),
            );
            pluginBuild.onLoad({ filter: /\.css$/ }, async ({ path }) => {
              const { code, cssModule } = parcel({
                url: path,
                code: await cssPreTransform(path),
                nesting: true,
              });
              if (!cssModule) return { contents: code, loader: "css" };
              cssModulesMap[path] = code;
              const exports = cssModuleToJS(cssModule);
              return { contents: `import "transpiled:${path}";${exports}` };
            });
          },
        },
        {
          name: "virtual",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /^virtual:@rds\// }, (args) => ({
              path: args.path.slice(13),
              namespace: "virtual",
            }));
            pluginBuild.onLoad(
              { filter: /./, namespace: "virtual" },
              async (args) => {
                switch (args.path) {
                  case "css-base":
                    return { contents: await getCSSBase(), loader: "css" };
                  case "css-utils":
                    hasCSSUtils = true;
                    return { contents: CSS_UTILS_PLACEHOLDER, loader: "css" };
                  default:
                    throw new Error(`Unexpected virtual entry: ${args.path}`);
                }
              },
            );
          },
        },
        {
          name: "svg",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /\.svg/ }, (args) => {
              const [path, namespace] = args.path.split("?");
              return { path: join(args.resolveDir, path), namespace };
            });
            pluginBuild.onLoad(
              { filter: /\.svg$/u },
              async ({ path, namespace }) => {
                const contents = await readFile(path);
                if (namespace === "inline") {
                  return { contents, loader: "dataurl" };
                }
                if (namespace === "url") return { contents, loader: "file" };
                return { contents: svgToJSX(contents), loader: "jsx" };
              },
            );
          },
        },
      ],
    });
  } catch {
    // esbuild has already logged perfect errors, no need to had anything
    process.exit(1);
  }
  log("Assets bundled");

  const paths = Object.keys(bundleResult.metafile.outputs);
  const jsPath = paths.find((p) => p.endsWith(".js"))!;
  const esbuildCSSPath = paths.find((p) => p.endsWith(".css"))!;

  let cssOutput = readFileSync(esbuildCSSPath, "utf-8");

  // Issue with TS flow control
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (hasCSSUtils) {
    await cssGenerator.scanContentCache.get(jsPath);
    cssOutput = cssOutput.replace(
      CSS_UTILS_PLACEHOLDER,
      cssGenerator.generate(),
    );
    log("CSS utils");
  }

  const minifiedCSS = parcel({
    url: "dist/assets/index.css",
    code: cssOutput,
    minify: true,
  }).code;
  log("Minify CSS");
  const parcelCSSPath = `dist/assets/index.${getHash(minifiedCSS)}.css`;
  writeFileSync(parcelCSSPath, minifiedCSS);
  rmSync(esbuildCSSPath);
  rmSync(`${esbuildCSSPath}.map`);
  log("Write CSS");

  execSync("cp -r public/ dist", { shell: "/bin/bash" });
  log("Copy public");

  writeFileSync(
    "dist/index.html",
    readFileSync("dist/index.html", "utf-8").replace(
      "</head>",
      `  <link rel="stylesheet" href="${parcelCSSPath.slice(4)}">
    <script type="module" src="${jsPath.slice(4)}"></script>
  </head>`,
    ),
  );
  console.log(
    colors.green(
      `Done in ${Math.ceil(performance.now() - global.__rds_start)}ms`,
    ),
  );
  stopProfiler();
};

main();
