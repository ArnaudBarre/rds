import { readFileSync } from "fs";

import { createServer } from "./createServer";
import { startServer } from "./startServer";
import { getExtension } from "./utils";
import { Extension } from "./mimeTypes";
import { commandWrapper } from "./commandWrapper";

export const main = commandWrapper(async (config) => {
  const server = createServer(config, (url) => {
    const path = url.includes(".") ? url : "index.html";
    try {
      return {
        content: readFileSync(`dist/${path}`),
        type: getExtension(path) as Extension,
        browserCache: path.startsWith("assets/"),
      };
    } catch (err: any) {
      if (err.code === "ENOENT") return "NOT_FOUND";
      throw err;
    }
  });
  await startServer(server, config);
  return server.close;
});
