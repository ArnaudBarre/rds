import { HMR_HEADER, type HMRPayload } from "../hmr.ts";
import { ErrorOverlay, overlayId } from "./overlay.ts";
import "./inspector.ts";
import "./css-devtools.ts";
import { RefreshRuntime } from "./refresh-runtime.js";
import { newStyleSheet } from "./utils.ts";

RefreshRuntime.injectIntoGlobalHook(window);
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;

export { RefreshRuntime };

console.debug("[rds] connecting....");

const socket = new WebSocket(
  window.location.origin.replace("http", "ws"),
  HMR_HEADER,
);

let isFirstUpdate = true;

socket.addEventListener("message", ({ data }) => {
  const payload: HMRPayload = JSON.parse(data);
  switch (payload.type) {
    case "connected":
      console.debug("[rds] Connected");
      break;
    case "update":
      // If this is the first update and there's already an error overlay, it
      // means the page opened with existing server compile error and the whole
      // module script failed to load (since one of the nested imports is 500).
      // In this case a normal update won't work and a full reload is needed.
      if (isFirstUpdate && document.querySelector(overlayId)) {
        window.location.reload();
        return;
      }
      clearErrorOverlay();
      isFirstUpdate = false;

      for (const path of payload.paths) {
        // Dynamic import are not re-evaluated when cached.
        // fetch + temp script tag allow to have caching + revaluate js modules
        // on each hot update.
        fetch(path)
          .then(async (response) => {
            const script = document.createElement("script");
            script.setAttribute("type", "module");
            script.innerHTML = await response.text();
            document.head.appendChild(script);
            document.head.removeChild(script);
            console.debug(`[rds] Hot updated: ${path}`);
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
    case "css-list-update":
      orderedStylesList = payload.paths;
      for (const node of document.head.querySelectorAll("[data-id]")) {
        const id = node.getAttribute("data-id")!;
        if (id.endsWith(".css")) {
          const style = stylesMap.get(id);
          if (style) document.head.removeChild(style);
        }
      }
      for (const id of orderedStylesList) {
        const style = stylesMap.get(id);
        if (style) document.head.appendChild(style);
      }
      break;
    case "error":
      clearErrorOverlay();
      document.body.appendChild(new ErrorOverlay(payload.error));
      break;
  }
});

const clearErrorOverlay = () =>
  document.querySelector<ErrorOverlay>(overlayId)?.close();

socket.addEventListener("close", async ({ wasClean }) => {
  if (wasClean) return;
  console.debug("[rds] Server connection lost. Polling for restart...");
  while (true) {
    try {
      await fetch("/rds-ping");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  window.location.reload();
});

// Injected by server at runtime
declare let orderedStylesList: string[];

const stylesMap = new Map<string, HTMLStyleElement>();

export const updateStyle = (id: string, content: string) => {
  const style = stylesMap.get(id);
  if (style) {
    style.innerHTML = content;
  } else {
    const newStyle = newStyleSheet(id, content);
    stylesMap.set(id, newStyle);
    const index = orderedStylesList.indexOf(id);
    if (index > -1) {
      for (const node of document.head.querySelectorAll("[data-id]")) {
        const dataId = node.getAttribute("data-id")!;
        if (!id.endsWith(".css")) continue;
        const dataIndex = orderedStylesList.indexOf(dataId);
        if (dataIndex === -1) continue;
        if (dataIndex > index) {
          document.head.insertBefore(newStyle, node);
          return;
        }
      }
    }
    document.head.appendChild(newStyle);
  }
};
