#!/usr/bin/env tnode
import fs from "fs";
import { build } from "esbuild";
import { Worker } from "worker_threads";

import { dependencies } from "../package.json";

const output = "template/node_modules/rds";

build({
  bundle: true,
  entryPoints: [
    "src/server/dev.ts",
    "src/server/build.ts",
    "src/server/serve.ts",
    "src/server/tscWorker.ts",
    "src/server/eslintWorker.ts",
  ],
  outdir: `${output}/server`,
  platform: "node",
  target: "node16",
  external: Object.keys(dependencies).concat(["chalk"]),
  legalComments: "inline",
  watch: true,
});
build({
  bundle: true,
  entryPoints: ["src/client/index.ts"],
  outdir: `${output}/client`,
  platform: "browser",
  format: "esm",
  target: "safari13",
  legalComments: "inline",
  watch: true,
});

setTimeout(() => {
  fs.writeFileSync(
    `${output}/server/inject.js`,
    'import React from "react";\nexport { React };',
  );
  if (!fs.existsSync(`${output}/bin`)) fs.mkdirSync(`${output}/bin`);
  fs.copyFileSync(
    "bin/openChrome.applescript",
    `${output}/bin/openChrome.applescript`,
  );
  // eslint-disable-next-line no-new
  new Worker(`./${output}/server/tscWorker`);
}, 1000);
