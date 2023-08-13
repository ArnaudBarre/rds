import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logEsbuildErrors } from "@arnaud-barre/config-loader";
import { downwind } from "@arnaud-barre/downwind/esbuild";
import { build, type BuildResult, type Metafile } from "esbuild";
import { colors } from "./colors.ts";
import { commandWrapper } from "./commandWrapper.ts";
import { ENTRY_POINT } from "./consts.ts";
import { esbuildFilesLoaders } from "./mimeTypes.ts";
import { stopProfiler } from "./stopProfiler.ts";
import { svgToJS } from "./svgToJS.ts";
import { readFile } from "./utils.ts";

export const main = commandWrapper(async (config) => {
  if (config.build.emptyOutDir) {
    rmSync("dist", { recursive: true, force: true });
  }
  let bundleResult: BuildResult & { metafile: Metafile };
  try {
    bundleResult = await build({
      entryPoints: [ENTRY_POINT],
      bundle: true,
      outdir: "dist/assets",
      sourcemap: true,
      metafile: true,
      splitting: true,
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
                  'import { forwardRef } from "react";',
                  "forwardRef",
                ),
                loader: "js",
              };
            });
          },
        },
        {
          name: "json-url",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /\.json\?url$/ }, (args) => ({
              path: join(args.resolveDir, args.path.slice(0, -4)),
              namespace: "json-url",
            }));
            pluginBuild.onLoad(
              { filter: /\.json$/, namespace: "json-url" },
              (args) => ({ loader: "file", contents: readFileSync(args.path) }),
            );
          },
        },
      ],
    });
  } catch {
    // esbuild has already logged perfect errors, no need to add anything
    process.exit(1);
  }
  logEsbuildErrors(bundleResult);

  cpSync("public", "dist", { recursive: true });

  const outputs = Object.entries(bundleResult.metafile.outputs);
  const jsEntryPoint = outputs.find(([p]) => p.endsWith(".js"))!;
  const jsImports = [
    ...jsEntryPoint[1].imports
      .filter((i) => i.kind === "import-statement")
      .map((i) => i.path.slice(4)),
    jsEntryPoint[0].slice(4),
  ]
    .map((path) => `<script type="module" src="${path}"></script>`)
    .join("\n    ");
  const html = readFileSync("dist/index.html", "utf-8").replace(
    "</head>",
    `  <link rel="stylesheet" href="${jsEntryPoint[1].cssBundle!.slice(4)}">
    ${jsImports}
  </head>`,
  );
  writeFileSync("dist/index.html", html);
  if (config.build.metafile) {
    writeFileSync("dist/meta.json", JSON.stringify(bundleResult.metafile));
  }

  const files = [{ path: "dist/index.html", bytes: Buffer.byteLength(html) }];
  let longest = 0;
  for (const [path, { bytes }] of outputs) {
    if (path.endsWith(".map")) continue;
    if (path.length > longest) longest = path.length;
    files.push({ path, bytes });
  }
  files.sort((a, z) => a.bytes - z.bytes);
  const maxFileSize = Math.trunc(Math.log10(files.at(-1)!.bytes)) + 1;
  for (const { path, bytes } of files) {
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
  }
  stopProfiler();
});
