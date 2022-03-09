import { CLIENT_PING, HMR_HEADER, HMR_PING } from "../consts";
import { HMRPayload } from "../hmrPayload";
import { ErrorOverlay, overlayId } from "./overlay";

import * as RefreshRuntime from "./refresh-runtime";

RefreshRuntime.injectIntoGlobalHook(window);
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;

export { RefreshRuntime };

console.log("[rds] connecting....");

const socket = new WebSocket(
  window.location.origin.replace("http", "ws"),
  HMR_HEADER,
);

let isFirstUpdate = true;

socket.addEventListener("message", ({ data }) => {
  const payload: HMRPayload = JSON.parse(data);
  switch (payload.type) {
    case "connected":
      console.log("[rds] Connected");
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
      }
      clearErrorOverlay();
      isFirstUpdate = false;

      for (const path of payload.paths) {
        // dynamic import are not re-evaluated when cached
        // fetch + temp script tag allow to have caching +
        // revaluate js modules on each hot update
        fetch(path)
          .then(async (response) => {
            const script = document.createElement("script");
            script.setAttribute("type", "module");
            script.innerHTML = await response.text();
            document.head.appendChild(script);
            document.head.removeChild(script);
            console.log(`[rds] Hot updated: ${path}`);
          })
          .catch((err) => {
            if (!(err as Error).message.includes("fetch")) console.error(err);
            console.error(
              `[hmr] Failed to reload ${path}. This could be due to syntax errors. (see errors above)`,
            );
          });
      }
      break;
    case "reload":
      window.location.reload();
      break;
    case "prune-css":
      payload.paths.forEach(removeStyle);
      break;
    case "error":
      clearErrorOverlay();
      document.body.appendChild(new ErrorOverlay(payload.error));
      break;
  }
});

const clearErrorOverlay = () =>
  (document.getElementById(overlayId) as ErrorOverlay | null)?.close();

// ping server
socket.addEventListener("close", async ({ wasClean }) => {
  if (wasClean) return;
  console.log("[rds] Server connection lost. Polling for restart...");
  await waitForSuccessfulPing();
  window.location.reload();
});

const waitForSuccessfulPing = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    try {
      await fetch(CLIENT_PING);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
};

const stylesMap = new Map<string, HTMLStyleElement>();

export const updateStyle = (id: string, content: string) => {
  const style = stylesMap.get(id);
  if (style) {
    style.innerHTML = content;
  } else {
    const newStyle = document.createElement("style");
    newStyle.setAttribute("type", "text/css");
    newStyle.innerHTML = content;
    document.head.appendChild(newStyle);
    stylesMap.set(id, newStyle);
  }
};

const removeStyle = (id: string) => {
  const style = stylesMap.get(id);
  if (!style) return;
  document.head.removeChild(style);
  stylesMap.delete(id);
};
