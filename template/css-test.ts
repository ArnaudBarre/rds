#!/usr/bin/env tnode
import fs from "fs";
import process from "process";
import { cssGenerator } from "../src/server/css/generator";

const main = async () => {
  const start = performance.now();
  await cssGenerator.scanContentCache.get("local/test.js");
  console.log((performance.now() - start).toFixed(2));
  fs.writeFileSync("local/result.css", cssGenerator.generate());
  console.log((performance.now() - start).toFixed(2));
  if (session) {
    session.post("Profiler.stop", (err: any, { profile }: any) => {
      // Write profile to disk, upload, etc.
      if (!err) {
        fs.writeFileSync(
          "local/rds-profile.cpuprofile",
          JSON.stringify(profile),
        );
        console.log("profiled");
      } else {
        throw err;
      }
    });
  }
};

if (process.argv.includes("--profile")) {
  const inspector = require("inspector");
  var session = new inspector.Session();
  session.connect();
  session.post("Profiler.enable", () => {
    session.post("Profiler.start", main);
  });
} else {
  main();
}
