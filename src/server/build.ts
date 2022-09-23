import { readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { build, BuildResult, Metafile } from "esbuild";
import { execSync } from "child_process";
import { downwind } from "@arnaud-barre/downwind/esbuild";

import { svgToJS } from "./svgToJS";
import { colors } from "./colors";
import { readFile } from "./utils";
import { esbuildFilesLoaders } from "./mimeTypes";
import { isDebug } from "./logger";
import { ENTRY_POINT } from "./consts";
import { stopProfiler } from "./stopProfiler";
import { commandWrapper } from "./commandWrapper";

const log = (step: string) => {
  if (!isDebug) return;
  console.log(
    `${colors.green(
      (performance.now() - global.__rds_start).toFixed(2),
    )} ${step}`,
  );
};

export const main = commandWrapper(async (config) => {
  log("Load");
  if (config.build.emptyOutDir) {
    rmSync("dist", { recursive: true, force: true });
  }
  log("Clean dist");
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
      target: config.build.target,
      minify: true,
      jsx: "automatic",
      define: config.define,
      publicPath: "/assets/",
      assetNames: "[name].[hash]",
      chunkNames: "[name].[hash]",
      entryNames: "[name].[hash]",
      loader: esbuildFilesLoaders,
      plugins: [
        downwind(),
        {
          name: "svg",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /\.svg/ }, (args) => {
              const [path, namespace] = args.path.split("?");
              return { path: join(args.resolveDir, path), namespace };
            });
            pluginBuild.onLoad({ filter: /\.svg$/u }, ({ path, namespace }) => {
              const contents = readFile(path);
              if (namespace === "inline") {
                return { contents, loader: "dataurl" };
              }
              if (namespace === "url") return { contents, loader: "file" };
              return {
                contents: svgToJS(
                  contents,
                  'import { jsx } from "react/jsx-runtime";',
                  "jsx",
                ),
                loader: "js",
              };
            });
          },
        },
      ],
    });
  } catch {
    // esbuild has already logged perfect errors, no need to add anything
    process.exit(1);
  }
  // TODO: log warnings
  log("Assets bundled");

  execSync("cp -r public/ dist", { shell: "/bin/bash" });
  log("Copy public");

  const paths = Object.keys(bundleResult.metafile.outputs);
  const jsPath = paths.find((p) => p.endsWith(".js"))!;
  const cssPath = paths.find((p) => p.endsWith(".css"))!;

  writeFileSync(
    "dist/index.html",
    readFileSync("dist/index.html", "utf-8").replace(
      "</head>",
      `  <link rel="stylesheet" href="${cssPath.slice(4)}">
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
});
