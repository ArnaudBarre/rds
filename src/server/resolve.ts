import { existsSync } from "fs";
import { dirname, extname, join } from "path";

import { cache } from "./utils";
import { RDSError } from "./errors";

const localError = "RDS: Unresolved import";

export const resolve = (from: string, importString: string) => {
  try {
    return withExtension(join(dirname(from), importString));
  } catch (e) {
    if ((e as any).message !== localError) throw e;
    throw RDSError({
      file: from,
      message: `Unresolved import: ${importString}`,
    });
  }
};

const testExtensions = (path: string) => {
  for (const extension of ["tsx", "ts", "jsx", "js"]) {
    const url = `${path}.${extension}`;
    if (existsSync(url)) return url;
  }
};
export const resolveExtensionCache = cache("resolveExtension", (path) => {
  const url = testExtensions(path) ?? testExtensions(`${path}/index`);
  if (!url) throw new Error(localError);
  return url;
});

const withExtension = (url: string) => {
  const ext = extname(url);
  if (ext) return url;
  return resolveExtensionCache.get(url);
};
