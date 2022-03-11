#!/usr/bin/env node
global.__rds_start = performance.now();
const version = "__VERSION__";
const cmd = process.argv[2] as string | undefined;

if (cmd === "-v" || cmd === "--version") {
  console.log(version);
  process.exit();
}
if (cmd === "--help" || cmd === undefined) {
  console.log(`RDS ${version}:`);
  console.log("  start, dev: Starts dev server");
  console.log("  build: Bundles and minify into /dist");
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

if (process.argv.includes("--force")) {
  require("fs").rmSync("node_modules/.rds", { recursive: true, force: true });
}

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
