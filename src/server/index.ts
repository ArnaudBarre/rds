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
import { RDS_CLIENT } from "./consts";
import { SWC_REGEX, initSwc } from "./swcTransform";
import { initPublicWatcher } from "./public";
import { getHash } from "./utils";

const server = createServer(async (req, res) => {
  const [url, query] = req.url!.split("?") as [string, string | undefined];
  const { content, type } = await handleRequest(url.slice(1), query);

  res.setHeader("Content-Type", mimeTypes[type]);
  if (query?.startsWith("h=")) {
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
const { swcTransform, srcWatcher } = initSwc(ws, {});

const handleRequest = async (
  url: string,
  _query: string | undefined,
): Promise<LoadedFile> => {
  if (url === RDS_CLIENT) {
    return {
      content: fs.readFileSync(
        path.join(__dirname, "../client/index.js"),
        "utf-8",
      ),
      type: "js",
    };
  }
  if (publicFiles.has(url)) return getPublicFile(url);
  if (SWC_REGEX.test(url)) return swcTransform(url);

  const { type, content } = await getPublicFile("index.html");
  return {
    type,
    content: content
      .replace(
        "<head>",
        `<head>
    <script type="module" src="/${RDS_CLIENT}"></script>`,
      )
      .replace(
        "</body>",
        '  <script type="module" src="/src/index.tsx"></script>\n</body>',
      ),
  };
};

server.listen(3000, async () => {
  console.log(colors.cyan(`[rds] Dev server running at:`));
  const localUrl = "http://localhost:3000";
  Object.values(os.networkInterfaces())
    .flatMap((nInterface) => nInterface ?? [])
    .filter((detail) => detail?.address && detail.family === "IPv4")
    .map((detail) =>
      detail.address.includes("127.0.0.1")
        ? `  > Local:   ${localUrl}`
        : `  > Network: http://${detail.address}:3000`,
    )
    .forEach((msg) => console.log(msg));
  console.log(
    colors.green(`Ready in ${(performance.now() - start).toFixed(0)} ms`),
  );
  if (process.platform === "darwin") {
    exec(`osascript openChrome.applescript ${localUrl}`, {
      cwd: path.join(__dirname, "../../bin"),
    });
  }
});

export const close = async () => {
  await srcWatcher.close();
  await publicWatcher.close();
  await ws.close();
  server.close();
};
