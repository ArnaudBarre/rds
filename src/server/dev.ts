import { existsSync, mkdirSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { Worker } from "node:worker_threads";
import { watch } from "chokidar";
import { assetsCache } from "./assets.ts";
import { clientCode } from "./client.ts";
import { colors } from "./colors.ts";
import { commandWrapper } from "./commandWrapper.ts";
import {
  DEPENDENCY_PREFIX,
  ENTRY_POINT,
  FS_PREFIX,
  RDS_CLIENT,
  RDS_DEVTOOLS_UPDATE,
  RDS_OPEN_IN_EDITOR,
  RDS_PREFIX,
} from "./consts.ts";
import { createServer } from "./createServer.ts";
import { bundleDependencies, dependenciesCache } from "./dependencies.ts";
import { getDownwind } from "./downwind.ts";
import { setupHmr } from "./hmr.ts";
import { initImportsTransform } from "./importsTransform.ts";
import { jsonCache } from "./json.ts";
import { logger } from "./logger.ts";
import type { Extension } from "./mimeTypes.ts";
import { openInEditor } from "./openInEditor.ts";
import { initPublicWatcher, publicFiles, publicFilesCache } from "./public.ts";
import { initScanner } from "./scanner.ts";
import { startServer } from "./startServer.ts";
import { svgCache } from "./svg.ts";
import { initSWC } from "./swc.ts";
import type { LoadedFile } from "./types.ts";
import {
  cacheDir,
  getExtension,
  getHashedUrl,
  getPathFromServerOutput,
  isCSS,
  isJS,
  isJSON,
  isSVG,
  readCacheFile,
} from "./utils.ts";
import { initWS } from "./ws.ts";

export const main = commandWrapper(async (config) => {
  const downwind = await getDownwind(config.build.target);
  const srcWatcher = watch([ENTRY_POINT], {
    ignoreInitial: true,
    disableGlobbing: true,
  });
  // eslint-disable-next-line no-new
  new Worker(getPathFromServerOutput("./tscWorker"));
  const eslintWorker = new Worker(getPathFromServerOutput("./eslintWorker"), {
    workerData: config.server.eslint,
  });
  const lintFile = (path: string) => eslintWorker.postMessage(path);

  if (!existsSync(cacheDir)) mkdirSync(cacheDir);
  const ws = initWS();
  const swcCache = await initSWC(config);
  const scanner = initScanner({
    downwind,
    swcCache,
    lintFile,
    watchFile: (path) => srcWatcher.add(path),
  });
  scanner.get(ENTRY_POINT);
  await bundleDependencies(config.build.target);

  const importsTransform = initImportsTransform({ scanner, downwind });
  importsTransform.get(ENTRY_POINT);

  const publicWatcher = initPublicWatcher(ws);
  setupHmr({
    downwind,
    srcWatcher,
    swcCache,
    scanner,
    importsTransform,
    lintFile,
    ws,
  });
  downwind.onUtilsUpdate((from) => {
    logger.info(
      colors.green(`${from} update `) +
        colors.dim("virtual:@downwind/utils.css"),
    );
    ws.send({
      type: "update",
      paths: [getHashedUrl("virtual:@downwind/utils.css", downwind.generate())],
    });
  });
  downwind.onReload((changedCSS) => {
    scanner.clear();
    importsTransform.clear();
    importsTransform.get(ENTRY_POINT);
    logger.info(
      colors.green("hmr update ") +
        colors.dim([...changedCSS, "virtual:@downwind/devtools"].join(", ")),
    );
    ws.send({
      type: "update",
      paths: [
        ...changedCSS.map((path) =>
          getHashedUrl(`${FS_PREFIX}/${path}`, importsTransform.get(path)),
        ),
        getHashedUrl("virtual:@downwind/devtools", downwind.devtoolsGenerate()),
      ],
    });
  });

  const server = createServer(config, (url, searchParams, res) => {
    if (url.startsWith(RDS_PREFIX)) {
      if (url === RDS_CLIENT) {
        return {
          type: "js",
          content:
            clientCode +
            `\nlet orderedStylesList = ${JSON.stringify(scanner.getCSSList())}`,
          // Not using hash because the browser serves a cached index.html on history back
          browserCache: false,
        };
      }
      if (url === RDS_OPEN_IN_EDITOR) {
        openInEditor(searchParams.get("file")!);
        return;
      }
      if (url === RDS_DEVTOOLS_UPDATE) {
        getBodyJson<string[]>(res.req)
          .then((classes) => {
            downwind.devtoolsScan(classes);
            res.writeHead(200);
            res.end();
          })
          .catch((err) => {
            res.writeHead(500);
            res.end(err.message);
          });
        return "HANDLED";
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }

    if (url.startsWith(FS_PREFIX)) {
      const path = url.slice(FS_PREFIX.length + 1);
      if (isJS(url) || isCSS(url)) {
        return js(importsTransform.get(path), searchParams.has("h"));
      }
      if (isSVG(url) && !searchParams.has("url")) return js(svgCache.get(path));
      if (isJSON(url) && !searchParams.has("url")) {
        return js(jsonCache.get(path));
      }
      return {
        type: getExtension(url) as Extension,
        content: assetsCache.get(path),
        browserCache: true,
      };
    }

    if (url.startsWith("virtual:")) {
      if (url === "virtual:@downwind/base.css") return js(downwind.getBase());
      if (url === "virtual:@downwind/utils.css") return js(downwind.generate());
      if (url === "virtual:@downwind/devtools") {
        return js(downwind.devtoolsGenerate());
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }

    if (url.startsWith(DEPENDENCY_PREFIX)) {
      const path = url.slice(DEPENDENCY_PREFIX.length + 1);
      if (url.endsWith(".map")) {
        const content = readCacheFile(path);
        return { type: "json", content, browserCache: false };
      }
      return js(dependenciesCache.get(path));
    }

    if (url.includes(".")) {
      if (!publicFiles.has(url)) return "NOT_FOUND";
      return {
        type: getExtension(url) as Extension,
        content: publicFilesCache.get(url),
        browserCache: false,
      };
    }

    const content = publicFilesCache.get("index.html");
    // Not using hash urls here because the browser serves a cached index.html on history back
    return {
      type: "html",
      content: content
        .toString()
        .replace(
          "</head>",
          `  <script type="module" src="/${RDS_CLIENT}"></script>
  </head>`,
        )
        .replace(
          "</body>",
          `  <script type="module" src="${FS_PREFIX}/${ENTRY_POINT}"></script>\n  </body>`,
        ),
      browserCache: false,
    };
  });
  server.on("upgrade", ws.handleUpgrade);

  await startServer(server, config);

  return async () => {
    await srcWatcher.close();
    await downwind.closeConfigWatcher();
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
});

const js = (content: string | Buffer, browserCache = true): LoadedFile => ({
  type: "js",
  content,
  browserCache,
});

const getBodyJson = <T>(req: IncomingMessage) =>
  new Promise<T>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("error", reject);
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });
