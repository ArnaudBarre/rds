import { watch } from "chokidar";

import { HMRWebSocket } from "./types";
import { cache, readFile } from "./utils";

export const initPublicWatcher = (ws: HMRWebSocket) => {
  const publicFiles = new Set<string>();
  const publicFilesCache = cache("publicFiles", (url) =>
    readFile(`public/${url}`),
  );
  const clearCacheAndReload = (path: string) => {
    if (publicFilesCache.has(path)) {
      publicFilesCache.delete(path);
      ws.send({ type: "reload" });
    }
  };

  return {
    publicFiles,
    publicWatcher: watch(".", { cwd: "public" })
      .on("add", (path) => publicFiles.add(path))
      .on("change", clearCacheAndReload)
      .on("unlink", (path) => {
        clearCacheAndReload(path);
        publicFiles.delete(path);
      }),
    getPublicFile: publicFilesCache.get,
  };
};
