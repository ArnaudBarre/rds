import { watch } from "chokidar";

import { ENTRY_POINT } from "./consts";

export const srcWatcher = watch([ENTRY_POINT], {
  ignoreInitial: true,
  disableGlobbing: true,
});
