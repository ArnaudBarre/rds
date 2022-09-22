import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Worker } from "worker_threads";
import { watch } from "chokidar";

import { colors } from "./colors";
import { initWS } from "./ws";
import { ENTRY_POINT } from "./consts";
import { initPublicWatcher } from "./public";
import { bundleDependencies } from "./dependencies";
import { logger } from "./logger";
import { initImportsTransform } from "./importsTransform";
import { setupHmr } from "./hmr";
import { createDevServer } from "./devServer";
import { loadConfig } from "./loadConfig";
import { startServer } from "./startServer";
import { initScanner } from "./scanner";
import { initSWC } from "./swc";
import { RDSError } from "./errors";
import { getDownwind } from "./downwind";
import { cacheDir, getHashedUrl } from "./utils";

export const main = async () => {
  const config = await loadConfig();
  const downwind = await getDownwind(config.target);
  const srcWatcher = watch([ENTRY_POINT], {
    ignoreInitial: true,
    disableGlobbing: true,
  });
  // eslint-disable-next-line no-new
  new Worker(resolve(__dirname, "./tscWorker"));
  const eslintWorker = new Worker(resolve(__dirname, "./eslintWorker"), {
    workerData: config.eslint,
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
  await bundleDependencies();

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
  downwind.onUtilsUpdate(() => {
    logger.info(
      colors.green("hmr update ") + colors.dim("virtual:@downwind/utils.css"),
    );
    ws.send({
      type: "update",
      paths: [getHashedUrl("virtual:@downwind/utils.css", downwind.generate())],
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
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
};

main().catch((e) => {
  if (e instanceof RDSError) logger.rdsError(e.payload);
  else console.error(e);
  process.exit(1);
});
