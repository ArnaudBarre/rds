import { existsSync } from "fs";
import { dirname, extname, join } from "path";

import { cache } from "./utils";

export const resolve = (from: string, importString: string) =>
  withExtension(join(dirname(from), importString));

const EXTENSIONS = ["tsx", "ts", "jsx", "js"] as const;
export const resolveExtensionCache = cache<string, typeof EXTENSIONS[number]>(
  "resolveExtension",
  (url) => {
    for (const extension of EXTENSIONS) {
      if (existsSync(`${url}.${extension}`)) return extension;
    }
    throw new Error(`Unresolved import: ${url}`);
  },
);

const withExtension = (url: string) => {
  const ext = extname(url);
  if (ext) return url;
  return `${url}.${resolveExtensionCache.get(url)}`;
};
