import { readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { build, BuildResult, Metafile } from "esbuild";
import { execSync } from "child_process";
import { logEsbuildErrors } from "@arnaud-barre/config-loader";
import { downwind } from "@arnaud-barre/downwind/esbuild";

import { svgToJS } from "./svgToJS";
import { colors } from "./colors";
import { readFile } from "./utils";
import { esbuildFilesLoaders } from "./mimeTypes";
import { ENTRY_POINT } from "./consts";
import { stopProfiler } from "./stopProfiler";
import { commandWrapper } from "./commandWrapper";
import { modulesCodegen } from "./modules-codegen";

export const main = commandWrapper(async (config) => {
  if (config.build.emptyOutDir) {
    rmSync("dist", { recursive: true, force: true });
  }
  const start = performance.now();
  modulesCodegen();
  console.log(`codegen: ${(performance.now() - start).toFixed(2)}ms`);
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
  logEsbuildErrors(bundleResult);

  execSync("cp -r public/ dist", { shell: "/bin/bash" });

  const outputs = Object.entries(bundleResult.metafile.outputs);
  const jsEntry = outputs.find(([p]) => p.endsWith(".js"))!;
  const html = readFileSync("dist/index.html", "utf-8").replace(
    "</head>",
    `  <link rel="stylesheet" href="${jsEntry[1].cssBundle!.slice(4)}">
    <script type="module" src="${jsEntry[0].slice(4)}"></script>
  </head>`,
  );
  writeFileSync("dist/index.html", html);

  const files = [{ path: "dist/index.html", bytes: Buffer.byteLength(html) }];
  let longest = 0;
  for (const [path, { bytes }] of outputs) {
    if (path.endsWith(".map")) continue;
    if (path.length > longest) longest = path.length;
    files.push({ path, bytes });
  }
  files.sort((a, z) => a.bytes - z.bytes);
  const maxFileSize = Math.trunc(Math.log10(files.at(-1)!.bytes)) + 1;
  files.forEach(({ path, bytes }) => {
    const printer = path.endsWith(".css")
      ? colors.magenta
      : path.endsWith(".js")
      ? colors.cyan
      : colors.green;
    console.log(
      colors.dim("dist/") +
        printer(path.slice(5).padEnd(longest - 3)) +
        colors.dim(`${(bytes / 1e3).toFixed(2).padStart(maxFileSize)} kB`),
    );
  });
  stopProfiler();
});
