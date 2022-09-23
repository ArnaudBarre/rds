import { InlineConfig } from "../types";

module.exports = {
  createDevServer: (inlineConfig?: InlineConfig) => {
    global.__rds_start = performance.now();
    return require("./start").main(inlineConfig);
  },
  build: (inlineConfig?: InlineConfig) => {
    global.__rds_start = performance.now();
    return require("./build").main(inlineConfig);
  },
  createPreviewServer: (inlineConfig?: InlineConfig) => {
    global.__rds_start = performance.now();
    return require("./serve").main(inlineConfig);
  },
};
