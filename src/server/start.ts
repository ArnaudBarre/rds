import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Worker } from "worker_threads";
import { watch } from "chokidar";

import { colors } from "./colors";
import { initWS } from "./ws";
import { ENTRY_POINT, FS_PREFIX } from "./consts";
import { initPublicWatcher } from "./public";
import { bundleDependencies } from "./dependencies";
import { logger } from "./logger";
import { initImportsTransform } from "./importsTransform";
import { setupHmr } from "./hmr";
import { createDevServer } from "./devServer";
import { startServer } from "./startServer";
import { initScanner } from "./scanner";
import { initSWC } from "./swc";
import { getDownwind } from "./downwind";
import { cacheDir, getHashedUrl } from "./utils";
import { commandWrapper } from "./commandWrapper";

export const main = commandWrapper(async (config) => {
  const downwind = await getDownwind(config.build.target);
  const srcWatcher = watch([ENTRY_POINT], {
    ignoreInitial: true,
    disableGlobbing: true,
  });
  // eslint-disable-next-line no-new
  new Worker(resolve(__dirname, "./tscWorker"));
  const eslintWorker = new Worker(resolve(__dirname, "./eslintWorker"), {
    workerData: config.server.eslint,
  });
  const lintFile = (path: string) => eslintWorker.postMessage(path);

  if (!existsSync(cacheDir)) mkdirSync(cacheDir);
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

  const ws = initWS();
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
  scanner.onCSSPrune((paths) => {
    ws.send({ type: "prune-css", paths });
  });

  const server = createDevServer({ config, importsTransform, downwind });
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
