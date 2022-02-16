import { getHash, lookup, readFileSync } from "./utils";
import { log } from "./logger";
import fs from "fs";

const start = performance.now();
const content = lookup(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
if (!content) {
  throw new Error(
    "Unable to find dependencies lockfile. This is required to ensure cache invalidation.",
  );
}
const patchesDir = lookup(["patches"]);
export const dependenciesHash = getHash(
  readFileSync(content) + (patchesDir ? fs.statSync(patchesDir).mtimeMs : ""),
);
log.debug(
  `Dependencies hash generated in ${Math.round(performance.now() - start)}ms`,
);
