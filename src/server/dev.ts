import { existsSync, mkdirSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { watch } from "chokidar";
import type { PluginBuild } from "esbuild";
import type { RDSPlugin } from "../types.d.ts";
import { assetsCache } from "./assets.ts";
import { clientCode, clientUrl } from "./client.ts";
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
  const watchFile = (path: string) => srcWatcher.add(path);
  const ws = initWS();
  if (!existsSync(cacheDir)) mkdirSync(cacheDir);

  const startCallbacks: (() => void)[] = [];
  const resolveCallbacks: Parameters<PluginBuild["onResolve"]>[] = [];
  const loadCallbacks: Parameters<PluginBuild["onLoad"]>[] = [];
  const disposeCallbacks: (() => void)[] = [];
  const pluginBuild: Parameters<NonNullable<RDSPlugin["dev"]>["setup"]>[0] = {
    onStart(cb) {
      startCallbacks.push(cb);
    },
    onResolve(options, callback) {
      resolveCallbacks.push([options, callback]);
    },
    onLoad(options, callback) {
      loadCallbacks.push([options, callback]);
    },
    onDispose(cb) {
      disposeCallbacks.push(cb);
    },
  };
  for (const plugin of config.plugins) await plugin.dev?.setup(pluginBuild);

  await Promise.all(startCallbacks.map((cb) => cb()));

  const swcCache = await initSWC(config);
  const scanner = initScanner({
    ws,
    downwind,
    swcCache,
    watchFile,
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
        colors.dim(
          [...changedCSS, "virtual:@downwind/devtools.css"].join(", "),
        ),
    );
    ws.send({
      type: "update",
      paths: [
        ...changedCSS.map((path) =>
          getHashedUrl(`${FS_PREFIX}/${path}`, importsTransform.get(path)),
        ),
        getHashedUrl(
          "virtual:@downwind/devtools.css",
          downwind.devtoolsGenerate(),
        ),
      ],
    });
  });

  const server = createServer(config, (url, searchParams, res) => {
    if (url.startsWith(RDS_PREFIX)) {
      if (url === RDS_CLIENT) return cachedJS(clientCode);
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
      if (isJS(url) || isCSS(url)) return cachedJS(importsTransform.get(path));
      if (isSVG(url) && !searchParams.has("url")) {
        return cachedJS(svgCache.get(path));
      }
      if (isJSON(url) && !searchParams.has("url")) {
        return cachedJS(jsonCache.get(path));
      }
      return {
        type: getExtension(url) as Extension,
        content: assetsCache.get(path),
        browserCache: true,
      };
    }

    if (url.startsWith("virtual:")) {
      if (url === "virtual:@downwind/base.css") {
        return cachedJS(downwind.getBase());
      }
      if (url === "virtual:@downwind/utils.css") {
        return cachedJS(downwind.generate());
      }
      if (url === "virtual:@downwind/devtools.css") {
        return cachedJS(downwind.devtoolsGenerate());
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }

    if (url.startsWith(DEPENDENCY_PREFIX)) {
      const path = url.slice(DEPENDENCY_PREFIX.length + 1);
      if (url.endsWith(".map")) {
        const content = readCacheFile(path);
        return { type: "json", content, browserCache: false };
      }
      return cachedJS(dependenciesCache.get(path));
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
    const entryUrl = importsTransform.toHashedUrl(ENTRY_POINT);
    const devtoolsUrl = getHashedUrl(
      "virtual:@downwind/devtools.css",
      downwind.devtoolsGenerate(),
    );
    return {
      type: "html",
      content: content
        .toString()
        .replace(
          "</head>",
          `  <script type="module" src="${clientUrl}"></script>
    <script type="module" src="${devtoolsUrl}"></script>
  </head>`,
        )
        .replace(
          "</body>",
          `  <script type="module" src="${entryUrl}"></script>\n  </body>`,
        ),
      browserCache: false,
    };
  });
  server.on("upgrade", ws.handleUpgrade);

  await startServer(server, config);

  return async () => {
    await Promise.all(disposeCallbacks.map((cb) => cb()));
    await srcWatcher.close();
    await downwind.closeConfigWatcher();
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
});

const cachedJS = (content: string | Buffer): LoadedFile => ({
  type: "js",
  content,
  browserCache: true,
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
