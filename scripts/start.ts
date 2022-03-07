#!/usr/bin/env tnode
import { build } from "esbuild";
import { dependencies } from "../package.json";

build({
  bundle: true,
  entryPoints: ["src/server/index.ts", "src/server/tscWorker.ts"],
  outdir: "dist/server",
  platform: "node",
  target: "node16",
  external: Object.keys(dependencies),
  legalComments: "inline",
  watch: true,
});
build({
  bundle: true,
  entryPoints: ["src/client/index.ts"],
  outdir: "dist/client",
  target: "safari13",
  legalComments: "inline",
  watch: true,
});
