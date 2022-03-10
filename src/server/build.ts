#!/usr/bin/env node
/* eslint-disable @typescript-eslint/naming-convention */
import { start } from "./start";
import fs, { writeFileSync } from "fs";
import { join } from "path";
import esbuild, { BuildResult, Metafile } from "esbuild";
import { execSync } from "child_process";

import { svgToJSX } from "./svgToJSX";
import { colors } from "./colors";
import { getHash, readFile, readFileSync } from "./utils";
import { esbuildFilesLoaders } from "./mimeTypes";
import { isDebug } from "./logger";
import { initCSS } from "./css";
import { cssModuleToJS } from "./css/utils/hmr";
import { ENTRY_POINT } from "./consts";
import { parcel } from "./css/parcel";

const log = (step: string) => {
  if (!isDebug) return;
  console.log(
    `${colors.green((performance.now() - start).toFixed(2))} ${step}`,
  );
};

const CSS_UTILS_PLACEHOLDER = "/*! CSS_UTILS */";

const main = async () => {
  log("Load");
  execSync("rm -rf dist && mkdir dist && cp -r public/ dist", {
    shell: "/bin/bash",
  });
  log("Init dist");
  const { cssPreTransform, cssGenerator } = await initCSS();
  log("Init CSS");
  const cssModulesMap: Record<string, string> = {};
  let hasCSSUtils = false;
  let bundleResult: BuildResult & { metafile: Metafile };
  try {
    bundleResult = await esbuild.build({
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
          setup: (build) => {
            build.onResolve({ filter: /^transpiled:/ }, ({ path }) => ({
              path: path.slice(11),
              namespace: "css-transpiled",
            }));
            build.onLoad(
              { filter: /./, namespace: "css-transpiled" },
              ({ path }) => ({ contents: cssModulesMap[path], loader: "css" }),
            );
            build.onLoad({ filter: /\.css$/ }, async ({ path }) => {
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
          setup: (build) => {
            build.onResolve({ filter: /^virtual:@rds\// }, (args) => ({
              path: args.path.slice(13),
              namespace: "virtual",
            }));
            build.onLoad({ filter: /./, namespace: "virtual" }, (args) => {
              switch (args.path) {
                case "css-utils":
                  hasCSSUtils = true;
                  return { contents: CSS_UTILS_PLACEHOLDER, loader: "css" };
                case "css-reset":
                  // TODO
                  return { contents: "" };
                default:
                  throw new Error(`Unexpected virtual entry: ${args.path}`);
              }
            });
          },
        },
        {
          name: "svg",
          setup: (build) => {
            build.onResolve({ filter: /\.svg/ }, (args) => {
              const [path, namespace] = args.path.split("?");
              return { path: join(args.resolveDir, path), namespace };
            });
            build.onLoad({ filter: /\.svg$/u }, async ({ path, namespace }) => {
              const contents = await readFile(path);
              if (namespace === "inline") {
                return { contents, loader: "dataurl" };
              }
              if (namespace === "url") return { contents, loader: "file" };
              return { contents: svgToJSX(contents), loader: "jsx" };
            });
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

  let cssOutput = readFileSync(esbuildCSSPath);

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
  fs.rmSync(esbuildCSSPath);
  fs.rmSync(`${esbuildCSSPath}.map`);
  log("Write CSS");

  writeFileSync(
    "dist/index.html",
    readFileSync("dist/index.html").replace(
      "</head>",
      `  <link rel="stylesheet" href="${parcelCSSPath.slice(4)}">
    <script type="module" src="${jsPath.slice(4)}"></script>
  </head>`,
    ),
  );
  console.log(
    colors.green(`Done in ${Math.ceil(performance.now() - start)}ms`),
  );
};

main();