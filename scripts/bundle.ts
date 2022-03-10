#!/usr/bin/env tnode
import { writeFileSync } from "fs";
import { Worker } from "worker_threads";
import { build, BuildOptions } from "esbuild";

import { dependencies } from "../package.json";

const dev = process.argv.includes("--dev");

const serverOptions: BuildOptions = {
  outdir: "dist/server",
  platform: "node",
  target: "node16",
  legalComments: "inline",
  watch: dev,
};

build({
  entryPoints: ["src/server/index.ts"],
  ...serverOptions,
});
build({
  bundle: true,
  entryPoints: [
    "src/server/start.ts",
    "src/server/build.ts",
    "src/server/serve.ts",
    "src/server/tscWorker.ts",
    "src/server/eslintWorker.ts",
  ],
  external: Object.keys(dependencies).concat(["chalk"]),
  ...serverOptions,
});
build({
  bundle: true,
  entryPoints: ["src/client/index.ts"],
  outdir: "dist/dist/client",
  platform: "browser",
  format: "esm",
  target: "safari13",
  legalComments: "inline",
  watch: dev,
});

writeFileSync(
  "dist/server/inject.js",
  'import React from "react";\nexport { React };',
);

if (dev) {
  setTimeout(() => {
    // eslint-disable-next-line no-new
    new Worker("dist/server/tscWorker");
  }, 300);
}
