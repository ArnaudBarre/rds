#!/usr/bin/env node
import { start } from "./start";
import { createServer } from "http";
import { join } from "path";
import os from "os";
import { exec } from "child_process";

import { colors } from "./colors";
import { mimeTypes } from "./mimeTypes";
import { ws } from "./ws";
import { LoadedFile } from "./types";
import {
  DEPENDENCY_PREFIX,
  ENTRY_POINT,
  RDS_CLIENT,
  RDS_CSS_UTILS,
  RDS_PREFIX,
} from "./consts";
import { publicFiles, publicFilesCache, publicWatcher } from "./public";
import {
  getExtension,
  getHash,
  isCSS,
  isJS,
  isSVG,
  readCacheFile,
  readFileSync,
} from "./utils";
import {
  buildDependencies,
  getDependency,
  transformDependenciesImports,
} from "./dependencies";
import { log } from "./logger";
import { transformSrcImports } from "./transform";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { cssGenerator } from "./css/generator";
import { srcWatcher } from "./srcWatcher";
import { setupHmr } from "./hmr";
import { cssToHMR } from "./css/utils";

const server = createServer(async (req, res) => {
  const [url, query] = req.url!.split("?") as [string, string | undefined];
  const { content, type, browserCache } = await handleRequest(
    url.slice(1),
    new URLSearchParams(query),
  );

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

server.on("upgrade", ws.handleUpgrade);
setupHmr();

const handleRequest = async (
  url: string,
  _query: URLSearchParams,
): Promise<LoadedFile> => {
  if (url.startsWith(RDS_PREFIX)) {
    if (url === RDS_CLIENT) {
      return {
        content: readFileSync(join(__dirname, "../client/index.js")),
        type: "js",
        browserCache: false, // TODO: use caching based on rds version
      };
    }
    if (url === RDS_CSS_UTILS) {
      return {
        content: cssToHMR(url, cssGenerator.generate(), false),
        type: "js",
        browserCache: true,
      };
    }
    throw new Error(`Unexpect entry point: ${url}`);
  }

  if (publicFiles.has(url)) {
    const content = await publicFilesCache.get(url);
    return { type: getExtension(url), content, browserCache: false };
  }

  if (url.startsWith(DEPENDENCY_PREFIX)) {
    const path = url.slice(DEPENDENCY_PREFIX.length + 1);
    if (url.endsWith(".map")) {
      const content = await readCacheFile(path);
      return { type: "json", content, browserCache: false }; // TODO: enable browser cache
    } else {
      const code = await getDependency(path);
      return { type: "js", content: code, browserCache: true };
    }
  }
  if (isJS(url)) {
    const { code, depsImports } = await transformSrcImports.get(url);
    const content = await transformDependenciesImports(code, depsImports);
    return { type: "js", content, browserCache: true };
  }
  if (isCSS(url)) {
    const { code } = await transformSrcImports.get(url);
    return { type: "js", content: code, browserCache: true };
  }
  if (isSVG(url)) {
    const code = await svgCache.get(url);
    const content = await transformDependenciesImports(code, [
      { source: "react", specifiers: [] },
    ]);
    return { type: "js", content, browserCache: true };
  }
  if (url.includes(".")) {
    const content = await assetsCache.get(url);
    return { type: getExtension(url), content, browserCache: true };
  }

  const content = await publicFilesCache.get("index.html");
  const entryUrl = await transformSrcImports.toHashedUrl(ENTRY_POINT);
  return {
    type: "html",
    content: content
      .replace(
        "<head>",
        `<head>\n    <script type="module" src="/${RDS_CLIENT}"></script>`,
      )
      .replace(
        "</body>",
        `  <script type="module" src="${entryUrl}"></script>\n  </body>`,
      ),
    browserCache: false,
  };
};

transformSrcImports
  .get(ENTRY_POINT)
  .then(async () => {
    await buildDependencies();
    cssGenerator.enableUpdates();
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
          cwd: join(__dirname, "../../bin"),
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
