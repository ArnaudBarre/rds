#!/usr/bin/env tnode
import fs from "fs";
import process from "process";
import { getCSSGenerator } from "../src/server/css/generator";
import { getCSSConfig } from "../src/server/css/cssConfig";
import { getVariants } from "../src/server/css/variants";
import { getTokenParser } from "../src/server/css/tokenParser";

const main = async () => {
  const cssConfig = await getCSSConfig();
  const variantsMap = getVariants(cssConfig);
  const tokenParser = getTokenParser({ cssConfig, variantsMap });
  const cssGenerator = getCSSGenerator({ cssConfig, variantsMap, tokenParser });
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
