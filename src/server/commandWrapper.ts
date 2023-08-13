import type { InlineConfig } from "../types.d.ts";
import { RDSError } from "./errors.ts";
import { loadConfig, type ResolvedConfig } from "./loadConfig.ts";
import { logger } from "./logger.ts";

export const commandWrapper =
  <T>(main: (config: ResolvedConfig) => Promise<T>) =>
  async (inlineConfig?: InlineConfig) => {
    const config = await loadConfig(inlineConfig);
    try {
      return await main(config);
    } catch (e) {
      if (e instanceof RDSError) logger.rdsError(e.payload);
      throw e;
    }
  };
