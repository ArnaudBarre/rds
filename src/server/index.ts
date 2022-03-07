#!/usr/bin/env node
import { start } from "./start";
import { join } from "path";
import os from "os";
import { exec } from "child_process";

import { colors } from "./colors";
import { initWS } from "./ws";
import { ENTRY_POINT, RDS_CSS_UTILS } from "./consts";
import { initPublicWatcher } from "./public";
import { buildDependencies } from "./dependencies";
import { log } from "./logger";
import { initImportsTransform } from "./importsTransform";
import { initCSS } from "./css";
import { setupHmr } from "./hmr";
import { initHttpServer, listen } from "./httpServer";
import { watch } from "chokidar";
import { loadConfig } from "./loadConfig";

export const startServer = async () => {
  const [{ cssTransform, cssGenerator }, config] = await Promise.all([
    initCSS(),
    loadConfig(),
  ]);
  const srcWatcher = watch([ENTRY_POINT], {
    ignoreInitial: true,
    disableGlobbing: true,
  });
  const importsTransform = initImportsTransform({
    cssTransform,
    cssGenerator,
    watchFile: (path) => srcWatcher.add(path),
  });

  await importsTransform.get(ENTRY_POINT);
  await buildDependencies();
  const ws = initWS();
  const publicWatcher = initPublicWatcher(ws);

  setupHmr({ importsTransform, cssTransform, cssGenerator, ws, srcWatcher });
  cssGenerator.onUpdate(() => {
    log.info(colors.green("hmr update ") + colors.dim(RDS_CSS_UTILS));
    ws.send({ type: "update", paths: [cssGenerator.getHashedCSSUtilsUrl()] });
  });
  importsTransform.onNewDep(() => {
    ws.send({ type: "reload" });
  });
  importsTransform.onCSSPrune((paths) => {
    ws.send({ type: "prune-css", paths });
  });

  const server = initHttpServer({ importsTransform, cssGenerator });
  server.on("upgrade", ws.handleUpgrade);

  const port = await listen(server, config);
  log.info(colors.cyan(`Dev server running at:`));
  const localUrl = `http://localhost:${port}`;
  if (config.host) {
    Object.values(os.networkInterfaces())
      .flatMap((nInterface) => nInterface ?? [])
      .filter((detail) => detail?.address && detail.family === "IPv4")
      .map((detail) =>
        detail.address.includes("127.0.0.1")
          ? `  > Local:   ${localUrl}`
          : `  > Network: http://${detail.address}:${port}`,
      )
      .forEach((msg) => log.info(msg));
  } else {
    log.info(`  > Local: ${localUrl}`);
    log.info(`  > Network: ${colors.dim("use `--host` to expose")}`);
  }

  log.info(
    colors.green(`Ready in ${(performance.now() - start).toFixed(0)} ms`),
  );
  if (process.platform === "darwin" && config.open) {
    exec(`osascript openChrome.applescript ${localUrl}`, {
      cwd: join(__dirname, "../../bin"),
    });
  }

  return async () => {
    await srcWatcher.close();
    await publicWatcher.close();
    await ws.close();
    server.close();
  };
};

startServer();
