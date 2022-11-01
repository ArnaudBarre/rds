#!/usr/bin/env tnode
import { readFileSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { Worker } from "worker_threads";
import { build, BuildOptions } from "esbuild";

import * as packageJSON from "../package.json";
import { esbuildFilesLoaders } from "../src/server/mimeTypes";

const dev = process.argv.includes("--dev");
const outdir = dev ? "template/node_modules/@arnaud-barre/rds" : "dist";

rmSync(outdir, { force: true, recursive: true });

const serverOptions: BuildOptions = {
  outdir: `${outdir}/server`,
  platform: "node",
  target: "node16",
  legalComments: "inline",
  define: { __VERSION__: `"${packageJSON.version}"` },
  watch: dev,
};

Promise.all([
  build({
    entryPoints: ["src/server/index.ts", "src/server/cli.ts"],
    ...serverOptions,
  }),
  build({
    bundle: true,
    entryPoints: [
      "src/server/start.ts",
      "src/server/build.ts",
      "src/server/serve.ts",
      "src/server/tscWorker.ts",
      "src/server/eslintWorker.ts",
    ],
    external: [
      ...Object.keys(packageJSON.peerDependencies),
      ...Object.keys(packageJSON.dependencies),
      "chalk", // In eslint worker
    ],
    ...serverOptions,
  }),
  build({
    bundle: true,
    entryPoints: ["src/client/index.ts"],
    outdir: `${outdir}/client`,
    platform: "browser",
    format: "esm",
    target: "safari13",
    legalComments: "inline",
    watch: dev,
  }),
]).then(() => {
  execSync(`cp -r src/types.d.ts bin LICENSE README.md ${outdir}/`);

  writeFileSync(
    `${outdir}/client.d.ts`,
    readFileSync("src/client.d.ts", "utf-8") +
      Object.keys(esbuildFilesLoaders)
        .flatMap((ext) => [
          `declare module "*${ext}" {\n  const src: string;\n  export default src;\n}\n`,
          `declare module "*${ext}?inline" {\n  const data: string;\n  export default data;\n}\n`,
        ])
        .join(""),
  );

  writeFileSync(
    `${outdir}/package.json`,
    JSON.stringify(
      {
        name: packageJSON.name,
        description:
          "React Development Server: A modern CRA inspired by Vite and powered by SWC, esbuild & Lightning CSS",
        version: packageJSON.version,
        author: "Arnaud Barré (https://github.com/ArnaudBarre)",
        license: packageJSON.license,
        repository: "github:ArnaudBarre/rds",
        main: "server/index.js",
        types: "types",
        bin: { rds: "server/cli.js" },
        keywords: ["react", "dev-server"],
        peerDependencies: packageJSON.peerDependencies,
        dependencies: packageJSON.dependencies,
      },
      null,
      2,
    ),
  );

  // eslint-disable-next-line no-new
  if (dev) new Worker(`./${outdir}/server/tscWorker`);
});
