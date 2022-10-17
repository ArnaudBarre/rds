import { rmSync } from "fs";
import { loadConfig as configLoader } from "@arnaud-barre/config-loader";

import { InlineConfig, UserConfig } from "../types";
import { debugNow, logger } from "./logger";
import { cacheDir } from "./utils";

export type ResolvedConfig = Awaited<ReturnType<typeof loadConfig>>;

export const loadConfig = async (
  inlineConfig: InlineConfig | undefined = {},
) => {
  const start = debugNow();
  if (inlineConfig.force) rmSync(cacheDir, { recursive: true, force: true });
  const configFile: UserConfig =
    (await configLoader<UserConfig>("rds"))?.config ?? {};
  const mergedConfig = mergeConfig<UserConfig>(configFile, inlineConfig);
  const proxyUrl = mergedConfig.server?.proxy
    ? new URL(mergedConfig.server.proxy.target)
    : undefined;
  const resolvedConfig = {
    server: {
      host: false,
      port: 3000,
      strictPort: false,
      open: false,
      ...mergedConfig.server,
      eslint: { cache: true, fix: false, ...mergedConfig.server?.eslint },
      proxy: proxyUrl
        ? {
            host: proxyUrl.hostname,
            port: proxyUrl.port,
            pathRewrite: mergedConfig.server?.proxy?.pathRewrite,
            headersRewrite: mergedConfig.server?.proxy?.headersRewrite,
          }
        : undefined,
    },
    define: mergedConfig.define ?? {},
    build: {
      emptyOutDir: mergedConfig.build?.emptyOutDir ?? true,
      // https://github.com/vitejs/vite/blob/main/packages/vite/src/node/constants.ts#L14-L23
      target: mergedConfig.build?.target ?? [
        "es2020",
        "edge88",
        "firefox78",
        "chrome87",
        "safari13",
      ],
    },
  };
  logger.debug(`Load config: ${(debugNow() - start).toFixed(2)}ms`);
  return resolvedConfig;
};

const mergeConfig = <T extends Record<string, unknown>>(a: T, b: T) => {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (typeof value === "object" && value !== null) {
      merged[key as keyof T] = mergeConfig(
        merged[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      ) as T[keyof T];
    } else if (value !== undefined) {
      merged[key as keyof T] = value as T[keyof T];
    }
  }
  return merged;
};
