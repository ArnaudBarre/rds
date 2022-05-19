#!/usr/bin/env node
import { resolve } from "path";
import { Worker } from "worker_threads";
import { watch } from "chokidar";

import { colors } from "./colors";
import { initWS } from "./ws";
import { ENTRY_POINT, RDS_CSS_UTILS } from "./consts";
import { initPublicWatcher } from "./public";
import { bundleDependencies } from "./dependencies";
import { logger } from "./logger";
import { initImportsTransform } from "./importsTransform";
import { initCSS } from "./css";
import { setupHmr } from "./hmr";
import { createDevServer } from "./devServer";
import { loadConfig } from "./loadConfig";
import { startServer } from "./startServer";
import { initScan } from "./scan";
import { initSWC } from "./swc";
import { isRDSError } from "./errors";

export const main = async () => {
  const [{ getCSSBase, cssTransform, cssGenerator }, config] =
    await Promise.all([initCSS(), loadConfig()]);
  const srcWatcher = watch([ENTRY_POINT], {
    ignoreInitial: true,
    disableGlobbing: true,
  });
  // eslint-disable-next-line no-new
  new Worker(resolve(__dirname, "./tscWorker"));
  const eslintWorker = config.eslint
    ? new Worker(resolve(__dirname, "./eslintWorker"), {
        workerData: config.eslint,
      })
    : undefined;

  const swcCache = initSWC(config);
  const scanner = initScan({
    cssTransform,
    cssGenerator,
    swcCache,
    lintFile: (path) => eslintWorker?.postMessage(path),
    watchFile: (path) => srcWatcher.add(path),
  });
  await scanner.get(ENTRY_POINT);
  await bundleDependencies();

  const importsTransform = initImportsTransform({
    scanner,
    getCSSBase,
    cssGenerator,
  });
  await importsTransform.get(ENTRY_POINT);

  const ws = initWS();
  const publicWatcher = initPublicWatcher(ws);
  setupHmr({
    cssTransform,
    cssGenerator,
    srcWatcher,
    swcCache,
    scanner,
    importsTransform,
    ws,
  });
  cssGenerator.onUpdate(() => {
    logger.info(colors.green("hmr update ") + colors.dim(RDS_CSS_UTILS));
    ws.send({ type: "update", paths: [cssGenerator.getHashedCSSUtilsUrl()] });
  });
  scanner.onCSSPrune((paths) => {
    ws.send({ type: "prune-css", paths });
  });

  const server = createDevServer({
    config,
    importsTransform,
    cssGenerator,
    getCSSBase,
  });
  server.on("upgrade", ws.handleUpgrade);

  await startServer(server, config);

  return async () => {
    await srcWatcher.close();
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
};

main().catch((e) => {
  if (isRDSError(e)) logger.hmrError(e);
  else console.error(e);
  process.exit(1);
});
