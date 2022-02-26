import { watch } from "chokidar";

import { ws } from "./ws";

import { cache, readFile } from "./utils";

export const publicFiles = new Set<string>();
export const publicFilesCache = cache("publicFiles", (url) =>
  readFile(`public/${url}`),
);
const clearCacheAndReload = (path: string) => {
  if (publicFilesCache.has(path)) {
    publicFilesCache.delete(path);
    ws.send({ type: "reload" });
  }
};

export const publicWatcher = watch(".", { cwd: "public" })
  .on("add", (path) => publicFiles.add(path))
  .on("change", clearCacheAndReload)
  .on("unlink", (path) => {
    clearCacheAndReload(path);
    publicFiles.delete(path);
  });
