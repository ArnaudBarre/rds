import { readFileSync } from "fs";
import { join } from "path";

import { RDS_CLIENT } from "./consts";
import { getHashedUrl } from "./utils";

export const clientCode = readFileSync(join(__dirname, "../client/index.js"));
export const clientUrl = getHashedUrl(RDS_CLIENT, clientCode);
