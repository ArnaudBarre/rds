import { loadConfig, ResolvedConfig } from "./loadConfig";
import { InlineConfig } from "../types";
import { RDSError } from "./errors";
import { logger } from "./logger";

export const commandWrapper =
  <T>(main: (config: ResolvedConfig) => T) =>
  async (inlineConfig?: InlineConfig) => {
    const config = await loadConfig(inlineConfig);
    try {
      return main(config);
    } catch (e) {
      if (e instanceof RDSError) logger.rdsError(e.payload);
      throw e;
    }
  };
