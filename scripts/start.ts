#!/usr/bin/env tnode
import { build } from "esbuild";
import { Worker } from "worker_threads";

import { dependencies } from "../package.json";

build({
  bundle: true,
  entryPoints: [
    "src/server/index.ts",
    "src/server/tscWorker.ts",
    "src/server/eslintWorker.ts",
  ],
  outdir: "dist/server",
  platform: "node",
  target: "node16",
  external: Object.keys(dependencies).concat(["chalk"]),
  legalComments: "inline",
  watch: true,
});
build({
  bundle: true,
  entryPoints: ["src/client/index.ts"],
  outdir: "dist/client",
  platform: "browser",
  format: "esm",
  target: "safari13",
  legalComments: "inline",
  watch: true,
});

// eslint-disable-next-line no-new
new Worker("./dist/server/tscWorker");
