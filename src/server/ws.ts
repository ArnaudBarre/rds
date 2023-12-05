import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { HMR_HEADER, type HMRPayload, type RDSErrorPayload } from "../hmr.ts";
import { colors } from "./colors.ts";
import { logger } from "./logger.ts";

export type WS = ReturnType<typeof initWS>;

export const initWS = () => {
  const wss = new WebSocketServer({ noServer: true });

  // On page reloads, if a file fails to compile and returns 500, the server
  // sends the error payload before the client connection is established.
  // If we have no open clients, buffer the error and send it to the next
  // connected client.
  let bufferedError: RDSErrorPayload | undefined;

  wss.on("error", (e: Error & { code: string }) => {
    if (e.code !== "EADDRINUSE") {
      logger.info(
        colors.red(`WebSocket server error:\n${e.stack ?? e.message}`),
      );
    }
  });

  return {
    handleUpgrade: (req: IncomingMessage, duplex: Duplex, head: Buffer) => {
      if (req.headers["sec-websocket-protocol"] === HMR_HEADER) {
        wss.handleUpgrade(req, duplex, head, (socket) => {
          const connectedPayload: HMRPayload = { type: "connected" };
          socket.send(JSON.stringify(connectedPayload));
          if (bufferedError) {
            socket.send(JSON.stringify(bufferedError));
            bufferedError = undefined;
          }
        });
      }
    },
    send: (payload: HMRPayload) => {
      if (payload.type === "error" && !wss.clients.size) {
        bufferedError = payload.error;
        return;
      }
      const stringified = JSON.stringify(payload);
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(stringified);
      }
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of wss.clients) client.terminate();
        wss.close((err) => {
          if (err) reject(err);
          resolve();
        });
      }),
  };
};
