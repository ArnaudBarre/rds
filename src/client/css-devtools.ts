import { RDS_DEVTOOLS_UPDATE } from "../server/consts.ts";

/** Adapted from https://github.com/unocss/unocss/blob/main/packages/vite/src/client.ts */

const sentClasses = new Set();
const pendingClasses = new Set();
let timeoutId: number | undefined;

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const i of Array.from((mutation.target as Element).classList)) {
      if (!sentClasses.has(i)) pendingClasses.add(i);
    }
  }
  if (pendingClasses.size) {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    const payload = Array.from(pendingClasses);
    timeoutId = setTimeout(() => {
      void fetch(`/${RDS_DEVTOOLS_UPDATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((res) => {
        if (res.ok) {
          for (const el of payload) {
            sentClasses.add(el);
            pendingClasses.delete(el);
          }
        }
      });
    }, 10) as any;
  }
}).observe(document.documentElement, {
  subtree: true,
  attributeFilter: ["class"],
});
