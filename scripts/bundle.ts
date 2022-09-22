#!/usr/bin/env tnode
import { readFileSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { Worker } from "worker_threads";
import { build, BuildOptions } from "esbuild";

import {
  name,
  version,
  license,
  dependencies,
  peerDependencies,
} from "../package.json";
import { esbuildFilesLoaders } from "../src/server/mimeTypes";

const dev = process.argv.includes("--dev");

rmSync("dist", { force: true, recursive: true });

const serverOptions: BuildOptions = {
  outdir: "dist/server",
  platform: "node",
  target: "node16",
  legalComments: "inline",
  define: { __VERSION__: `"${version}"` },
  watch: dev,
};

Promise.all([
  build({
    entryPoints: ["src/server/cli.ts"],
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
      ...Object.keys(peerDependencies),
      ...Object.keys(dependencies),
      "chalk", // In eslint worker
    ],
    ...serverOptions,
  }),
  build({
    bundle: true,
    entryPoints: ["src/client/index.ts"],
    outdir: "dist/client",
    platform: "browser",
    format: "esm",
    target: "safari13",
    legalComments: "inline",
    watch: dev,
  }),
]).then(() => {
  execSync("cp -r src/types.d.ts bin LICENSE README.md dist/");

  writeFileSync(
    "dist/client.d.ts",
    readFileSync("src/client.d.ts", "utf-8") +
      Object.keys(esbuildFilesLoaders)
        .flatMap((ext) => [
          `declare module "*${ext}" {\n  const src: string;\n  export default src;\n}\n`,
          `declare module "*${ext}?inline" {\n  const data: string;\n  export default data;\n}\n`,
        ])
        .join(""),
  );

  writeFileSync(
    "dist/package.json",
    JSON.stringify(
      {
        name,
        description: "React development server",
        version,
        author: "Arnaud Barré (https://github.com/ArnaudBarre)",
        license,
        repository: "github:ArnaudBarre/rds",
        types: "types",
        bin: { rds: "server/cli.js" },
        keywords: ["react", "dev-server"],
        dependencies,
      },
      null,
      2,
    ),
  );

  // eslint-disable-next-line no-new
  if (dev) new Worker("./dist/server/tscWorker");
});
