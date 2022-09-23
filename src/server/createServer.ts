import { createServer as createHTTPServer, request } from "http";
import { getHash } from "@arnaud-barre/config-loader";

import { LoadedFile } from "./types";
import { mimeTypes } from "./mimeTypes";
import { logger } from "./logger";
import { ResolvedConfig } from "./loadConfig";

export const createServer = (
  config: ResolvedConfig,
  handleRequest: (
    url: string,
    query: URLSearchParams,
  ) => LoadedFile | "NOT_FOUND" | undefined,
) =>
  createHTTPServer((req, res) => {
    const [url, query] = req.url!.split("?") as [string, string | undefined];
    if (config.server.proxy && url.startsWith("/api/")) {
      req.pipe(
        request(
          {
            host: config.server.proxy.host,
            port: config.server.proxy.port,
            path: config.server.proxy.pathRewrite?.(url) ?? url,
            method: req.method,
            headers:
              config.server.proxy.headersRewrite?.(req.headers) ?? req.headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode!, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          },
        ).on("error", (err) => {
          res.writeHead(500);
          res.end(err.message);
        }),
        { end: true },
      );
      return;
    }
    const loadedFile = handleRequest(url.slice(1), new URLSearchParams(query));

    if (!loadedFile) {
      res.writeHead(200);
      res.end();
      return;
    }

    if (loadedFile === "NOT_FOUND") {
      logger.info(`Not found: ${url}`);
      res.writeHead(404);
      res.end();
      return;
    }

    const mimeType = mimeTypes[loadedFile.type];
    if (mimeType) res.setHeader("Content-Type", mimeType);
    else logger.debug(`No mime type for ${url}`);

    if (loadedFile.browserCache) {
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.writeHead(200);
      res.end(loadedFile.content);
    } else {
      const etag = `"${getHash(loadedFile.content)}"`;
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Etag", etag);

      if (req.headers["if-none-match"] === etag) {
        res.writeHead(304);
        res.end();
      } else {
        res.writeHead(200);
        res.end(loadedFile.content);
      }
    }
  });
