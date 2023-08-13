#!/usr/bin/env node
import type { InlineConfig } from "../types.d.ts";

global.__rds_start = performance.now();
const cmd = process.argv[2] as string | undefined;

if (cmd === "-v" || cmd === "--version") {
  console.log(__VERSION__);
  process.exit();
}

const help = () => {
  console.log(`\x1b[36mRDS ${__VERSION__}\x1b[39m
 \x1b[35m dev, start \x1b[39m      start dev server
 \x1b[35m build \x1b[39m           bundle and minify into /dist
 \x1b[35m preview, serve \x1b[39m  preview build output`);
};

if (cmd === "--help" || cmd === undefined) {
  help();
  process.exit();
}

const main = async () => {
  if (cmd === "build") {
    return (await import("./build.ts")).main({
      build: {
        metafile: process.argv.includes("--meta") ? true : undefined,
      },
    } satisfies InlineConfig);
  }
  const indexPort = process.argv.indexOf("--port");
  const port =
    indexPort !== -1 ? parseInt(process.argv[indexPort + 1]) : undefined;
  const inlineConfig: InlineConfig = {
    force: process.argv.includes("--force") ? true : undefined,
    server: {
      port: port && !isNaN(port) ? port : undefined,
      open: process.argv.includes("--open") ? true : undefined,
      host: process.argv.includes("--host") ? true : undefined,
      qrCode: process.argv.includes("--qr") ? true : undefined,
    },
  };
  if (cmd === "dev" || cmd === "start") {
    return (await import("./dev.ts")).main(inlineConfig);
  } else if (cmd === "preview" || cmd === "serve") {
    return (await import("./preview.ts")).main(inlineConfig);
  }

  console.error(`\x1b[31mUnsupported command: ${cmd}\x1b[39m`);
  help();
  process.exit(1);
};

if (process.argv.includes("--profile")) {
  const inspector = await import("inspector");
  const session = new inspector.Session();
  global.__rds_profile_session = session;
  session.connect();
  session.post("Profiler.enable", () => {
    session.post("Profiler.start", main);
  });
} else {
  await main();
}
