#!/usr/bin/env node
import { execSync } from "node:child_process";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build, type BuildOptions, context } from "esbuild";
import oxcPackageJson from "oxc-transform/package.json" with { type: "json" };
import packageJSON from "../package.json" with { type: "json" };
import { esbuildFilesLoaders } from "../src/server/mimeTypes.ts";

const dev = process.argv.includes("--dev");
const outdir = dev ? "template/node_modules/@arnaud-barre/rds" : "dist";

rmSync(outdir, { force: true, recursive: true });

const serverOptions: BuildOptions = {
  outdir: `${outdir}/server`,
  platform: "node",
  format: "esm",
  target: "node20",
  legalComments: "inline",
  define: {
    __VERSION__: `"${packageJSON.version}"`,
    __OXC_VERSION__: `"${oxcPackageJson.version}"`,
  },
};

const buildOrWatch = async (options: BuildOptions) => {
  if (!dev) return await build(options);
  const c = await context(options);
  await c.watch();
  await c.rebuild();
};

await Promise.all([
  buildOrWatch({
    bundle: true,
    splitting: true,
    entryPoints: ["src/server/index.ts", "src/server/cli.ts"],
    external: [
      ...Object.keys(packageJSON.peerDependencies),
      ...Object.keys(packageJSON.dependencies),
    ],
    ...serverOptions,
  }),
  buildOrWatch({
    bundle: true,
    entryPoints: ["src/client/index.ts"],
    outdir: `${outdir}/client`,
    platform: "browser",
    format: "esm",
    target: "safari14",
    legalComments: "inline",
  }),
]);

execSync(`cp -r bin LICENSE README.md ${outdir}/`);
cpSync("src/types.d.ts", `${outdir}/server/index.d.ts`);

writeFileSync(
  `${outdir}/client.d.ts`,
  readFileSync("src/client.d.ts", "utf-8")
    + Object.keys(esbuildFilesLoaders)
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
        "React Development Server: A modern CRA inspired by Vite and powered by oxc, esbuild & Lightning CSS",
      type: "module",
      version: packageJSON.version,
      author: "Arnaud Barré (https://github.com/ArnaudBarre)",
      license: packageJSON.license,
      repository: "github:ArnaudBarre/rds",
      keywords: ["react", "dev-server"],
      bin: { rds: "server/cli.js" },
      exports: {
        ".": "./server/index.js",
        "./client": {
          types: "./client.d.ts",
        },
      },
      peerDependencies: packageJSON.peerDependencies,
      dependencies: packageJSON.dependencies,
    },
    null,
    2,
  ),
);
