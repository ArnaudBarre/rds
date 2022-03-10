import { join } from "path";
import { Server as HttpServer } from "http";
import { exec } from "child_process";
import os from "os";

import { ResolvedConfig } from "./loadConfig";
import { logger } from "./logger";
import { colors } from "./colors";

export const startServer = async ({
  server,
  config,
  start,
}: {
  server: HttpServer;
  config: ResolvedConfig;
  start: number;
}) => {
  const port = await listen(server, config);
  logger.info(colors.cyan("Dev server running at:"));
  const localUrl = `http://localhost:${port}`;
  if (config.server.host) {
    Object.values(os.networkInterfaces())
      .flatMap((nInterface) => nInterface ?? [])
      .filter((detail) => detail.address && detail.family === "IPv4")
      .map((detail) =>
        detail.address.includes("127.0.0.1")
          ? `  > Local:   ${localUrl}`
          : `  > Network: http://${detail.address}:${port}`,
      )
      .forEach((msg) => logger.info(msg));
  } else {
    logger.info(`  > Local: ${localUrl}`);
    logger.info(`  > Network: ${colors.dim("use `--host` to expose")}`);
  }

  logger.info(
    colors.green(`Ready in ${(performance.now() - start).toFixed(0)} ms`),
  );
  if (process.platform === "darwin" && config.open) {
    exec(`osascript openChrome.applescript ${localUrl}`, {
      cwd: join(__dirname, "../bin"),
    });
  }
};

const listen = async (httpServer: HttpServer, config: ResolvedConfig) =>
  new Promise<number>((resolve, reject) => {
    const host = config.server.host ? undefined : "127.0.0.1";
    let port = config.server.port;

    const onError = (e: Error & { code?: string }) => {
      if (e.code === "EADDRINUSE") {
        if (config.server.strictPort) {
          httpServer.removeListener("error", onError);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          logger.info(`Port ${port} is in use, trying another one...`);
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
