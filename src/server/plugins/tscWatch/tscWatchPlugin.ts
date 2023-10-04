import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { RDSPlugin } from "../../../types.d.ts";

export const plugin = (): RDSPlugin => ({
  dev: {
    name: "tsc-watch",
    setup: (build) => {
      build.onStart(() => {
        // eslint-disable-next-line no-new
        new Worker(
          join(dirname(fileURLToPath(import.meta.url)), "./tscWatchWorker"),
        );
      });
    },
  },
});
