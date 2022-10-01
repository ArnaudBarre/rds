import { readFileSync } from "fs";

import { cache } from "./cache";

export const assetsCache = cache("assets", (url) => readFileSync(url));
