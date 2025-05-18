import type { InlineConfig } from "../types.d.ts";

export const createDevServer = async (inlineConfig?: InlineConfig) => {
  global.__rds_start = performance.now();
  return await (await import("./dev.ts")).main(inlineConfig);
};
export const build = async (inlineConfig?: InlineConfig) => {
  global.__rds_start = performance.now();
  await (await import("./build.ts")).main(inlineConfig);
};
export const createPreviewServer = async (inlineConfig?: InlineConfig) => {
  global.__rds_start = performance.now();
  return await (await import("./preview.ts")).main(inlineConfig);
};
