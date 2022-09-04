import { readFileSync } from "fs";

import { cache } from "./utils";

export const assetsCache = cache("assets", (url) => readFileSync(url));
