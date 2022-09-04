import { loadConfig as configLoader } from "@arnaud-barre/config-loader";

import { UserConfig } from "../types";
import { debugNow, logger } from "./logger";
import { ESBUILD_MODULES_TARGET } from "./consts";

export type ResolvedConfig = Awaited<ReturnType<typeof loadConfig>>;

export const loadConfig = async () => {
  const start = debugNow();
  const config = await configLoader<UserConfig>("rds");
  const resolvedConfig = {
    open: config?.open ?? false,
    eslint: { cache: true, fix: false, ...config?.eslint },
    server: { host: false, port: 3000, strictPort: false, ...config?.server },
    proxy: config?.proxy,
    define: config?.define,
    target: config?.target ?? ESBUILD_MODULES_TARGET,
  };
  logger.debug(`Load config: ${(debugNow() - start).toFixed(2)}ms`);
  return resolvedConfig;
};
