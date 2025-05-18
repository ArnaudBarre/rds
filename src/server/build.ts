import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logEsbuildErrors } from "@arnaud-barre/config-loader";
import { downwind } from "@arnaud-barre/downwind/esbuild";
import { build, type BuildResult, type Metafile } from "esbuild";
import { toBase64Url } from "./assets.ts";
import { colors } from "./colors.ts";
import { commandWrapper } from "./commandWrapper.ts";
import { ENTRY_POINT } from "./consts.ts";
import { esbuildFilesLoaders } from "./mimeTypes.ts";
import { stopProfiler } from "./stopProfiler.ts";
import { svgToJS } from "./svgToJS.ts";
import { isCSS } from "./utils.ts";

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
      sourcemap: config.build.sourcemap ?? true,
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
        downwind({ intervalCheckMs: config.build.downwindIntervalCheckMs }),
        {
          name: "svg",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /\.svg/ }, (args) => {
              const [path, namespace] = args.path.split("?") as [
                string,
                string | undefined,
              ];
              return {
                path: join(args.resolveDir, path),
                namespace:
                  namespace ?? (isCSS(args.importer) ? "url" : undefined),
              };
            });
            pluginBuild.onLoad({ filter: /\.svg$/ }, (args) => {
              const contents = readFileSync(args.path);
              if (args.namespace === "inline") {
                return {
                  loader: "js",
                  contents: `export default "${toBase64Url(
                    args.path,
                    contents,
                  )}"`,
                };
              }
              if (args.namespace === "url") return { loader: "file", contents };
              return {
                loader: "js",
                contents: svgToJS(
                  contents.toString(),
                  'import { jsx } from "react/jsx-runtime";',
                  "jsx",
                  'import { forwardRef } from "react";',
                  "forwardRef",
                ),
              };
            });
          },
        },
        {
          name: "assets-inline",
          setup: (pluginBuild) => {
            pluginBuild.onResolve({ filter: /\?inline$/ }, (args) => ({
              path: join(args.resolveDir, args.path.slice(0, -7)),
              namespace: "assets-inline",
            }));
            pluginBuild.onLoad(
              { filter: /./, namespace: "assets-inline" },
              (args) => ({
                loader: "dataurl",
                contents: readFileSync(args.path),
              }),
            );
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
  } catch (e) {
    const isBuildFailure =
      typeof e === "object" && e && ("warnings" in e || "errors" in e);
    // for build failues, esbuild has already logged perfect errors, no need to add anything
    if (!isBuildFailure) console.error(e);
    process.exit(1);
  }
  logEsbuildErrors(bundleResult);

  cpSync("public", "dist", { recursive: true });

  const outputs = bundleResult.metafile.outputs;
  let jsEntryPoint: string | undefined;
  const secondaryCssOutputs: string[] = [];
  for (const outputPath in outputs) {
    if (outputPath.endsWith(".js")) {
      if (jsEntryPoint) {
        const { cssBundle } = outputs[outputPath];
        if (cssBundle) secondaryCssOutputs.push(cssBundle);
      } else {
        jsEntryPoint = outputPath;
      }
    }
  }
  for (const cssPath of secondaryCssOutputs) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete outputs[cssPath];
    rmSync(cssPath);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete outputs[`${cssPath}.map`];
    rmSync(`${cssPath}.map`);
  }

  const jsOutputMetadata = outputs[jsEntryPoint!];
  const jsImports = [
    ...jsOutputMetadata.imports
      .filter((i) => i.kind === "import-statement")
      .map((i) => i.path.slice(4)),
    jsEntryPoint!.slice(4),
  ]
    .map((path) => `<script type="module" src="${path}"></script>`)
    .join("\n    ");
  const html = readFileSync("dist/index.html", "utf-8").replace(
    "</head>",
    `  <link rel="stylesheet" href="${jsOutputMetadata.cssBundle!.slice(4)}">
    ${jsImports}
  </head>`,
  );
  writeFileSync("dist/index.html", html);
  if (config.build.metafile) {
    writeFileSync("dist/meta.json", JSON.stringify(bundleResult.metafile));
  }

  const files = [{ path: "dist/index.html", bytes: Buffer.byteLength(html) }];
  let longest = 0;
  for (const path in outputs) {
    if (path.endsWith(".map")) continue;
    if (path.length > longest) longest = path.length;
    files.push({ path, bytes: outputs[path].bytes });
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
      colors.dim("dist/")
        + printer(path.slice(5).padEnd(longest - 3))
        + colors.dim(`${(bytes / 1e3).toFixed(2).padStart(maxFileSize)} kB`),
    );
  }
  stopProfiler();
});
