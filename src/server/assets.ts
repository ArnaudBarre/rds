import { readFileSync } from "node:fs";
import { cache } from "./cache.ts";

export const assetsCache = cache("assets", (url) => readFileSync(url));
