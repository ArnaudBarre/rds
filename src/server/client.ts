import { readFileSync } from "node:fs";
import { RDS_CLIENT } from "./consts.ts";
import { getHashedUrl, getPathFromServerOutput } from "./utils.ts";

export const clientCode = readFileSync(
  getPathFromServerOutput("../client/index.js"),
);
export const clientUrl = getHashedUrl(RDS_CLIENT, clientCode);
