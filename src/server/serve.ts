#!/usr/bin/env node
import { start } from "./start";
import { promises as fs } from "fs";

import { loadConfig } from "./loadConfig";
import { createServer } from "./createServer";
import { startServer } from "./startServer";
import { getExtension } from "./utils";
import { Extension } from "./mimeTypes";

const main = async () => {
  const config = await loadConfig();
  const server = createServer(async (url) => {
    const path = url.includes(".") ? url : "index.html";
    try {
      return {
        content: await fs.readFile(`dist/${path}`),
        type: getExtension(path) as Extension,
        browserCache: path.startsWith("assets/"),
      };
    } catch (err: any) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  });
  await startServer({ server, config, start });
};

main();
