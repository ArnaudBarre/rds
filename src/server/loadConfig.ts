import { Config } from "../types";
import { getConfig } from "./bundleConfig";
import { log } from "./logger";

export type ResolvedConfig = Required<Config>;

export const loadConfig = async (): Promise<ResolvedConfig> => {
  const start = performance.now();
  const config = await getConfig<Config>("rds");
  log.debug(`Load config: ${(performance.now() - start).toFixed(2)}ms`);
  return { port: 3000, open: false, host: false, strictPort: false, ...config };
};
