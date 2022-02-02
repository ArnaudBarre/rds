import { watch } from "chokidar";

import { LoadedFile, HMRWebSocket } from "./types";
import { cache, readFile } from "./utils";

export const initPublicWatcher = (ws: HMRWebSocket) => {
  const publicFiles = new Set<string>();
  const publicFilesCache = cache<string, Promise<LoadedFile>>(async (url) => ({
    content: await readFile(`public/${url}`),
    type: url.slice(url.lastIndexOf(".") + 1),
  }));
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
