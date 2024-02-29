import { readFileSync } from "node:fs";
import { cache } from "./cache.ts";
import { type Extension, mimeTypes } from "./mimeTypes.ts";
import { getExtension } from "./utils.ts";

export const assetsCache = cache("assets", (url) => readFileSync(url));

export const toBase64Url = (resolveUrl: string, content: Buffer) => {
  const mimeType = mimeTypes[getExtension(resolveUrl) as Extension];
  return `data:${mimeType};base64,${content.toString("base64")}`;
};
