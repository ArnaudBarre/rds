#!/usr/bin/env node
import { start } from "./start";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";

import { colors } from "./colors";
import { mimeTypes } from "./mimeTypes";
import { createWebSocketServer } from "./ws";
import { LoadedFile } from "./types";
import { DEPENDENCY_PREFIX, ENTRY_POINT, RDS_CLIENT } from "./consts";
import { initPublicWatcher } from "./public";
import { getHash, readCacheFile } from "./utils";
import {
  buildDependencies,
  getDependency,
  transformDependenciesImports,
} from "./dependencies";
import { log } from "./logger";
import { initSrcWatcher } from "./watcher";
import { initTransformSrcImports } from "./transform";

const server = createServer(async (req, res) => {
  const [url, _query] = req.url!.split("?") as [string, string | undefined];
  const { content, type, browserCache } = await handleRequest(url.slice(1));

  res.setHeader("Content-Type", mimeTypes[type]);
  if (browserCache) {
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.writeHead(200);
    res.end(content);
  } else {
    const etag = `"${getHash(content)}"`;
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Etag", etag);

    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304);
      res.end();
    } else {
      res.writeHead(200);
      res.end(content);
    }
  }
});

const ws = createWebSocketServer(server);
const { publicFiles, publicWatcher, getPublicFile } = initPublicWatcher(ws);
const transformSrcImports = initTransformSrcImports(ws);
const srcWatcher = initSrcWatcher(ws, transformSrcImports);

const handleRequest = async (url: string): Promise<LoadedFile> => {
  if (url === RDS_CLIENT) {
    return {
      content: fs.readFileSync(
        path.join(__dirname, "../client/index.js"),
        "utf-8",
      ),
      type: "js",
      // TODO: use caching based on rds version
    };
  }
  if (publicFiles.has(url)) return getPublicFile(url);

  if (url.startsWith(DEPENDENCY_PREFIX)) {
    const path = url.slice(DEPENDENCY_PREFIX.length + 1);
    if (url.endsWith(".map")) {
      const content = await readCacheFile(path);
      return { type: "json", content };
    } else {
      const code = await getDependency(path);
      return { type: "js", content: code, browserCache: true };
    }
  }
  if (/\.[jt]sx?$/.test(url)) {
    const { code, depsImports } = await transformSrcImports.get(url);
    const content = await transformDependenciesImports(code, depsImports);
    return { type: "js", content, browserCache: url !== ENTRY_POINT };
  }
  // load as file
  if (url.includes(".")) throw new Error(`Unhandled file ${url}`);

  const { type, content } = await getPublicFile("index.html");
  return {
    type,
    content: content
      .replace(
        "<head>",
        `<head>\n    <script type="module" src="/${RDS_CLIENT}"></script>`,
      )
      .replace(
        "</body>",
        `  <script type="module" src="/${ENTRY_POINT}"></script>\n  </body>`,
      ),
  };
};

transformSrcImports
  .get(ENTRY_POINT)
  .then(async () => {
    await buildDependencies();
    server.listen(3000, async () => {
      log.info(colors.cyan(`[rds] Dev server running at:`));
      const localUrl = "http://localhost:3000";
      Object.values(os.networkInterfaces())
        .flatMap((nInterface) => nInterface ?? [])
        .filter((detail) => detail?.address && detail.family === "IPv4")
        .map((detail) =>
          detail.address.includes("127.0.0.1")
            ? `  > Local:   ${localUrl}`
            : `  > Network: http://${detail.address}:3000`,
        )
        .forEach((msg) => log.info(msg));
      log.info(
        colors.green(`Ready in ${(performance.now() - start).toFixed(0)} ms`),
      );
      if (process.platform === "darwin") {
        exec(`osascript openChrome.applescript ${localUrl}`, {
          cwd: path.join(__dirname, "../../bin"),
        });
      }
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

export const close = async () => {
  await srcWatcher.close();
  await publicWatcher.close();
  await ws.close();
  server.close();
};
