#!/usr/bin/env node
global.__rds_start = performance.now();
const args = process.argv.slice(2) as (string | undefined)[];
const cmd = args[0];

if (cmd === "-v" || cmd === "--version") {
  console.log(require("../../package.json").version);
  process.exit();
}
if (cmd === "--help" || cmd === undefined) {
  const version = require("../../package.json").version as string;
  console.log(`RDS ${version}:`);
  console.log("  -v, --version: Print version");
  console.log("  start, dev: Starts dev server");
  console.log("  build: Bundle and minify into /dist");
  console.log("  serve, preview: Serves build output");
  process.exit();
}

const main = () => {
  if (cmd === "start" || cmd === "dev") {
    require("./start");
  } else if (cmd === "build") {
    require("./build");
  } else if (cmd === "serve" || cmd === "preview") {
    require("./serve");
  } else {
    console.error(`Unsupported command ${cmd}`);
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
