import { join } from "path";
import { Server as HttpServer } from "http";
import { exec } from "child_process";
import { networkInterfaces } from "os";

import { ResolvedConfig } from "./loadConfig";
import { logger } from "./logger";
import { colors } from "./colors";
import { stopProfiler } from "./stopProfiler";

export const startServer = async (
  server: HttpServer,
  config: ResolvedConfig,
) => {
  const port = await listen(server, config);
  logger.info(
    colors.cyan(`RDS v${__VERSION__}`) +
      colors.dim(
        `   ready in ${(performance.now() - global.__rds_start).toFixed(0)} ms`,
      ),
  );
  const localUrl = `http://localhost:${port}`;
  if (config.server.host) {
    Object.values(networkInterfaces())
      .flatMap((nInterface) => nInterface ?? [])
      .filter(
        (detail) =>
          detail.address &&
          // Node 18 breaking change
          (detail.family === "IPv4" || (detail.family as any) === 4),
      )
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

  if (process.platform === "darwin" && config.server.open) {
    exec(`osascript openChrome.applescript ${localUrl}`, {
      cwd: join(__dirname, "../bin"),
    });
  }
  stopProfiler();
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
