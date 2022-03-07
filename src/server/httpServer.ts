import { createServer, Server as HttpServer } from "http";
import { mimeTypes } from "./mimeTypes";
import {
  getExtension,
  getHash,
  isCSS,
  isJS,
  isSVG,
  readCacheFile,
  readFileSync,
} from "./utils";
import { LoadedFile } from "./types";
import {
  DEPENDENCY_PREFIX,
  ENTRY_POINT,
  RDS_CLIENT,
  RDS_CSS_UTILS,
  RDS_PREFIX,
} from "./consts";
import { join } from "path";
import { cssToHMR } from "./css/utils/hmr";
import { publicFiles, publicFilesCache } from "./public";
import { getDependency, transformDependenciesImports } from "./dependencies";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { CSSGenerator } from "./css/generator";
import { ImportsTransform } from "./importsTransform";
import { ResolvedConfig } from "./loadConfig";
import { log } from "./logger";

export const initHttpServer = ({
  importsTransform,
  cssGenerator,
}: {
  importsTransform: ImportsTransform;
  cssGenerator: CSSGenerator;
}) => {
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
      const { code, depsImports } = await importsTransform.get(url);
      const content = await transformDependenciesImports({
        code,
        depsImports,
        cssGenerator,
      });
      return { type: "js", content, browserCache: true };
    }
    if (isCSS(url)) {
      const { code } = await importsTransform.get(url);
      return { type: "js", content: code, browserCache: true };
    }
    if (isSVG(url)) {
      const code = await svgCache.get(url);
      const content = await transformDependenciesImports({
        code,
        depsImports: [{ source: "react", specifiers: [] }],
        cssGenerator,
      });
      return { type: "js", content, browserCache: true };
    }
    if (url.includes(".")) {
      const content = await assetsCache.get(url);
      return { type: getExtension(url), content, browserCache: true };
    }

    const content = await publicFilesCache.get("index.html");
    const entryUrl = await importsTransform.toHashedUrl(ENTRY_POINT);
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

  return createServer(async (req, res) => {
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
};

export const listen = async (httpServer: HttpServer, config: ResolvedConfig) =>
  new Promise<number>((resolve, reject) => {
    const host = config.host ? undefined : "127.0.0.1";
    let port = config.port;

    const onError = (e: Error & { code?: string }) => {
      if (e.code === "EADDRINUSE") {
        if (config.strictPort) {
          httpServer.removeListener("error", onError);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          log.info(`Port ${port} is in use, trying another one...`);
          httpServer.listen(++port, host);
        }
      } else {
        httpServer.removeListener("error", onError);
        reject(e);
      }
    };

    httpServer.on("error", onError);

    httpServer.listen(port, host, () => {
      httpServer.removeListener("error", onError);
      resolve(port);
    });
  });
