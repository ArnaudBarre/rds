import { promises as fsp } from "fs";

import { cache } from "./utils";

export const assetsCache = cache("assets", (url) => fsp.readFile(url));
