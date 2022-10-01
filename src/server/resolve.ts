import { existsSync } from "fs";
import { dirname, extname, join } from "path";

import { cache } from "./cache";
import { RDSError } from "./errors";

const localError = "RDS: Unresolved import";

export const resolve = (from: string, importString: string) => {
  try {
    return resolveExtensionCache.get(join(dirname(from), importString));
  } catch (e: any) {
    if (e.message !== localError) throw e;
    throw new RDSError({
      file: from,
      message: `Unresolved import: ${importString}`,
    });
  }
};

export const resolveExtensionCache = cache("resolveExtension", (url) => {
  const ext = extname(url);
  if (ext && existsSync(url)) return url;
  const path = testExtensions(url) ?? testExtensions(`${url}/index`);
  if (!path) throw new Error(localError);
  return path;
});

const testExtensions = (url: string) => {
  for (const extension of ["tsx", "ts", "jsx", "js"]) {
    const path = `${url}.${extension}`;
    if (existsSync(path)) return path;
  }
};
