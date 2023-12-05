import { exec } from "node:child_process";
import type { Server as HttpServer } from "node:http";
import type { Socket } from "node:net";
import { networkInterfaces } from "node:os";
import { colors } from "./colors.ts";
import type { ResolvedConfig } from "./loadConfig.ts";
import { logger } from "./logger.ts";
import { generateQRCode } from "./qrcode/qrcode.ts";
import { stopProfiler } from "./stopProfiler.ts";
import { getPathFromServerOutput } from "./utils.ts";

export const startServer = async (
  server: HttpServer,
  config: ResolvedConfig,
) => {
  const sockets = new Set<any>();
  const onConnection = (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  };
  server.on("connection", onConnection);
  server.on("secureConnection", onConnection);

  const listen = async (host: boolean) => {
    const usedPort = await new Promise<number>((resolve, reject) => {
      const hostname = host ? undefined : "127.0.0.1";
      let port = config.server.port;

      const onError = (e: Error & { code?: string }) => {
        if (e.code === "EADDRINUSE") {
          if (config.server.strictPort) {
            server.removeListener("error", onError);
            reject(new Error(`Port ${port} is already in use`));
          } else {
            logger.info(`Port ${port} is in use, trying another one...`);
            server.listen(++port, hostname);
          }
        } else {
          server.removeListener("error", onError);
          reject(e);
        }
      };

      server.on("error", onError);

      server.listen(port, hostname, () => {
        server.removeListener("error", onError);
        resolve(port);
      });
    });
    const localUrl = `http://localhost:${usedPort}`;
    const logIndent = `  ${colors.green("➜")}`;
    let hostUrl: string | undefined;
    if (host) {
      for (const detail1 of Object.values(networkInterfaces())
        .flatMap((nInterface) => nInterface ?? [])
        .filter(
          (detail) =>
            detail.address &&
            // Node 18 breaking change
            (detail.family === "IPv4" || (detail.family as any) === 4),
        )) {
        if (detail1.address.includes("127.0.0.1")) {
          logger.info(`${logIndent} Local:   ${localUrl}`);
        } else {
          const url = `http://${detail1.address}:${usedPort}`;
          logger.info(`${logIndent} Network: ${url}`);
          if (!hostUrl) {
            hostUrl = url;
            if (config.server.qrCode) logger.info(generateQRCode(url, "    "));
          }
        }
      }
    } else {
      logger.info(`${logIndent} Local:   ${localUrl}`);
      logger.info(
        `${logIndent} Network: ${colors.dim("use `--host` to expose")}`,
      );
    }
    if (!host || !config.server.qrCode) {
      const help = host ? "qr to show QR Code" : "h to enable host";
      logger.info(colors.dim(`${logIndent} o to open browser, ${help}`));
    }
    return { localUrl, hostUrl };
  };

  logger.info(
    colors.cyan(`RDS v${__VERSION__}`) +
      colors.dim(
        `   ready in ${(performance.now() - global.__rds_start).toFixed(0)} ms`,
      ),
  );
  let { localUrl, hostUrl } = await listen(config.server.host);

  const openBrowser = () => {
    exec(`osascript openChrome.applescript ${localUrl}`, {
      cwd: getPathFromServerOutput("../bin"),
    });
  };

  process.stdin.on("data", async (data) => {
    const input = data.toString();
    if (input === "o\n") openBrowser();
    if (input === "h\n" && !hostUrl) {
      for (const socket of sockets) {
        socket.destroy();
        sockets.delete(socket);
      }
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const urls = await listen(true);
      localUrl = urls.localUrl;
      // eslint-disable-next-line require-atomic-updates
      hostUrl = urls.hostUrl;
    }
    if (input === "qr\n" && hostUrl) {
      logger.info(generateQRCode(hostUrl, "    "));
    }
  });

  if (process.platform === "darwin" && config.server.open) openBrowser();
  stopProfiler();
};
