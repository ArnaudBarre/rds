import { request } from "http";
import {
  createSecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
  SecureServerOptions,
} from "http2";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { getHash } from "@arnaud-barre/config-loader";

import { LoadedFile } from "./types";
import { mimeTypes } from "./mimeTypes";
import { logger } from "./logger";
import { ResolvedConfig } from "./loadConfig";
import { join } from "path";
import { cacheDir } from "./utils";

export const createServer = (
  config: ResolvedConfig,
  handleRequest: (
    url: string,
    query: URLSearchParams,
    res: Http2ServerResponse,
  ) => LoadedFile | "HANDLED" | "NOT_FOUND" | undefined,
) => {
  const proxy = config.server.proxy;
  if (!existsSync(join(cacheDir, "localhost-cert.pem"))) {
    execSync("mkcert localhost", { cwd: cacheDir, stdio: "ignore" });
  }
  const options: SecureServerOptions = {
    maxSessionMemory: 1000, // Manually increase the session memory to prevent 502 ENHANCE_YOUR_CALM errors on large numbers of requests
    cert: readFileSync(join(cacheDir, "localhost.pem")),
    key: readFileSync(join(cacheDir, "localhost-key.pem")),
    allowHTTP1: true,
  };

  const server = createSecureServer(options, (req, res) => {
    const [url, query] = req.url.split("?") as [string, string | undefined];
    if (proxy && (url.startsWith("/api/") || url === "/api")) {
      req.pipe(
        request(rewriteReq(req, proxy), (proxyRes) => {
          res.writeHead(proxyRes.statusCode!, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }).on("error", (err) => {
          res.writeHead(500);
          res.end(err.message);
        }),
        { end: true },
      );
      return;
    }

    const loadedFile = handleRequest(
      url.slice(1),
      new URLSearchParams(query),
      res,
    );

    if (loadedFile === "HANDLED") return;

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

  if (proxy) {
    server.on("upgrade", (req, socket) => {
      const [url] = req.url!.split("?");
      if (url.startsWith("/api/") || url === "/api") {
        request(rewriteReq(req, proxy))
          // Credit: node-http-proxy (https://github.com/http-party/node-http-proxy/blob/master/lib/http-proxy/passes/ws-incoming.js#L79)
          .on("upgrade", (proxyRes, proxySocket) => {
            const head = ["HTTP/1.1 101 Switching Protocols"];
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              if (Array.isArray(value)) {
                for (const element of value) head.push(`${key}: ${element}`);
              } else {
                head.push(`${key}: ${value!}`);
              }
            }
            socket.write(`${head.join("\r\n")}\r\n\r\n`);
            proxySocket.on("error", () => socket.end());
            // The pipe below will end proxySocket if socket closes cleanly, but not
            // if it errors (eg, vanishes from the net and starts returning EHOSTUNREACH).
            // We need to do that explicitly.
            socket.on("error", () => proxySocket.end());
            proxySocket.pipe(socket).pipe(proxySocket);
          })
          .on("error", () => socket.end())
          .end();
      }
    });
  }

  return server;
};

const rewriteReq = (
  req: Http2ServerRequest,
  proxy: NonNullable<ResolvedConfig["server"]["proxy"]>,
) => ({
  host: proxy.host,
  port: proxy.port,
  path: proxy.pathRewrite?.(req.url) ?? req.url,
  method: req.method,
  headers: proxy.headersRewrite?.(req.headers) ?? req.headers,
});
