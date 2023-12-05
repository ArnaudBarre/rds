import { readFileSync } from "node:fs";
import { getPathFromServerOutput } from "./utils.ts";

export const clientCode = readFileSync(
  getPathFromServerOutput("../client/index.js"),
  "utf-8",
);
