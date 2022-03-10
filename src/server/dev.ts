#!/usr/bin/env node
import { start } from "./start";
import { resolve } from "path";
import { Worker } from "worker_threads";

import { colors } from "./colors";
import { initWS } from "./ws";
import { ENTRY_POINT, RDS_CSS_UTILS } from "./consts";
import { initPublicWatcher } from "./public";
import { buildDependencies } from "./dependencies";
import { logger } from "./logger";
import { initImportsTransform } from "./importsTransform";
import { initCSS } from "./css";
import { setupHmr } from "./hmr";
import { createDevServer } from "./devServer";
import { watch } from "chokidar";
import { loadConfig } from "./loadConfig";
import { startServer } from "./startServer";

export const main = async () => {
  const [{ cssTransform, cssGenerator }, config] = await Promise.all([
    initCSS(),
    loadConfig(),
  ]);
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
  const importsTransform = initImportsTransform({
    cssTransform,
    cssGenerator,
    lintFile: (path) => eslintWorker?.postMessage(path),
    watchFile: (path) => srcWatcher.add(path),
  });

  await importsTransform.get(ENTRY_POINT);
  await buildDependencies();
  const ws = initWS();
  const publicWatcher = initPublicWatcher(ws);

  setupHmr({ importsTransform, cssTransform, cssGenerator, ws, srcWatcher });
  cssGenerator.onUpdate(() => {
    logger.info(colors.green("hmr update ") + colors.dim(RDS_CSS_UTILS));
    ws.send({ type: "update", paths: [cssGenerator.getHashedCSSUtilsUrl()] });
  });
  importsTransform.onNewDep(() => {
    ws.send({ type: "reload" });
  });
  importsTransform.onCSSPrune((paths) => {
    ws.send({ type: "prune-css", paths });
  });

  const server = createDevServer({ importsTransform, cssGenerator });
  server.on("upgrade", ws.handleUpgrade);

  await startServer({ server, config, start });

  return async () => {
    await srcWatcher.close();
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
};

main();
