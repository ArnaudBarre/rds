import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { RDSPlugin } from "../../../types.d.ts";

export type ESLintPluginOptions = {
  /** @default true */
  cache?: boolean;
  /** @default false */
  fix?: boolean;
};

export const plugin = (options?: ESLintPluginOptions): RDSPlugin => ({
  dev: {
    name: "eslint",
    setup: (build) => {
      let worker: Worker;
      build.onStart(() => {
        worker = new Worker(
          join(dirname(fileURLToPath(import.meta.url)), "./eslintWorker"),
          { workerData: { cache: true, fix: false, ...options } },
        );
      });
      build.onLoad({ filter: /\.[jt]sx?$/ }, (file) => {
        worker.postMessage(file.path);
        return undefined;
      });
    },
  },
});
