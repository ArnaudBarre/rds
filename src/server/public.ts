import { readFileSync } from "node:fs";
import { watch } from "chokidar";
import { cache } from "./cache.ts";
import type { WS } from "./ws.ts";

export const publicFiles = new Set<string>();
export const publicFilesCache = cache("publicFiles", (url) =>
  readFileSync(`public/${url}`),
);
export const initPublicWatcher = (ws: WS) => {
  const clearCacheAndReload = (path: string) => {
    if (publicFilesCache.has(path)) {
      publicFilesCache.delete(path);
      ws.send({ type: "reload" });
    }
  };
  return watch(".", { cwd: "public" })
    .on("add", (path) => publicFiles.add(path))
    .on("change", clearCacheAndReload)
    .on("unlink", (path) => {
      clearCacheAndReload(path);
      publicFiles.delete(path);
    });
};
