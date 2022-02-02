import { CLIENT_PING, HMR_HEADER, HMR_PING } from "../consts";
import { HMRPayload } from "../hmrPayload";
import { ErrorOverlay, overlayId } from "./overlay";

import * as RefreshRuntime from "./refresh-runtime";

RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;

export { RefreshRuntime };

console.log("[rds] connecting....");

const socket = new WebSocket(location.origin.replace("http", "ws"), HMR_HEADER);

let isFirstUpdate = true;

socket.addEventListener("message", async ({ data }) => {
  const payload: HMRPayload = JSON.parse(data);
  switch (payload.type) {
    case "connected":
      console.log(`[rds] Connected`);
      // proxy(nginx, docker) hmr ws maybe caused timeout,
      // so send ping package let ws keep alive.
      setInterval(() => socket.send(HMR_PING), 30_000);
      break;
    case "update":
      // if this is the first update and there's already an error overlay, it
      // means the page opened with existing server compile error and the whole
      // module script failed to load (since one of the nested imports is 500).
      // in this case a normal update won't work and a full reload is needed.
      if (isFirstUpdate && document.querySelectorAll(overlayId).length) {
        window.location.reload();
        return;
      } else {
        clearErrorOverlay();
        isFirstUpdate = false;
      }

      if (!hotModules.has(payload.path)) return; // Module not yet loaded (code splitting)
      const [base, query] = payload.path.split("?");
      try {
        await import(base + `?t=${Date.now()}${query ? `&${query}` : ""}`);
        console.log(`[rds] Hot updated: ${payload.path}`);
      } catch (err) {
        if (!(err as Error).message.includes("fetch")) {
          console.error(err);
        }
        console.error(
          `[hmr] Failed to reload ${payload.path}. This could be due to syntax errors. (see errors above)`,
        );
      }
      break;
    case "reload":
      location.reload();
      break;
    case "prune":
      // After an HMR update, some modules are no longer imported on the page,
      // but they may have left behind side effects that need to be cleaned up
      // (.e.g style injections)
      payload.paths.forEach((path) => pruneMap.get(path)?.());
      break;
    case "error":
      clearErrorOverlay();
      document.body.appendChild(new ErrorOverlay(payload.error));
      break;
  }
});

const clearErrorOverlay = () =>
  (document.getElementById(overlayId) as ErrorOverlay).close();

// ping server
socket.addEventListener("close", async ({ wasClean }) => {
  if (wasClean) return;
  console.log(`[rds] Server connection lost. Polling for restart...`);
  await waitForSuccessfulPing();
  location.reload();
});

const waitForSuccessfulPing = async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fetch(CLIENT_PING);
      break;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
};

const hotModules = new Set<string>();
const pruneMap = new Map<string, () => unknown>();

export const createHotContext = (ownerPath: string) => ({
  accept: () => hotModules.add(ownerPath),
  prune: (cb: () => unknown) => pruneMap.set(ownerPath, cb),
});
