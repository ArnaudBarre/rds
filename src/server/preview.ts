import { readFileSync } from "node:fs";
import { commandWrapper } from "./commandWrapper.ts";
import { createServer } from "./createServer.ts";
import type { Extension } from "./mimeTypes.ts";
import { startServer } from "./startServer.ts";
import { getExtension } from "./utils.ts";

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
