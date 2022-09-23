#!/usr/bin/env node
import { InlineConfig } from "../types";

global.__rds_start = performance.now();
const cmd = process.argv[2] as string | undefined;

if (cmd === "-v" || cmd === "--version") {
  console.log(__VERSION__);
  process.exit();
}

const help = () => {
  console.log(`\x1b[36mRDS ${__VERSION__}\x1b[39m
 \x1b[35m start, dev \x1b[39m      Starts dev server
 \x1b[35m build \x1b[39m           Bundles and minify into /dist
 \x1b[35m serve, preview \x1b[39m  Serves build output`);
};

if (cmd === "--help" || cmd === undefined) {
  help();
  process.exit();
}

const main = () => {
  const inlineConfig: InlineConfig = {
    force: process.argv.includes("--force") ? true : undefined,
    server: {
      open: process.argv.includes("--open") ? true : undefined,
      host: process.argv.includes("--host") ? true : undefined,
    },
  };
  if (cmd === "start" || cmd === "dev") {
    require("./start").main(inlineConfig);
  } else if (cmd === "build") {
    require("./build").main(inlineConfig);
  } else if (cmd === "serve" || cmd === "preview") {
    require("./serve").main(inlineConfig);
  } else {
    console.error(`\x1b[31mUnsupported command: ${cmd}\x1b[39m`);
    help();
    process.exit(1);
  }
};

if (process.argv.includes("--profile")) {
  const inspector = require("inspector");
  const session = new inspector.Session();
  global.__rds_profile_session = session;
  session.connect();
  session.post("Profiler.enable", () => {
    session.post("Profiler.start", main);
  });
} else {
  main();
}
