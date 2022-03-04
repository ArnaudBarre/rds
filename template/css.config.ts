import type { CSSConfig } from "../src/server/css/types";
import { colors } from "./src/colors";

export const config: CSSConfig = {
  theme: {
    extend: {
      colors,
      animation: {
        "spin-slow": "spin 20s linear infinite",
      },
    },
    spacing: {
      0: "0",
      2: "2px",
      4: "4px",
      6: "6px",
      8: "8px",
      10: "10px",
      12: "12px",
      14: "14px",
      16: "16px",
      18: "18px",
      20: "20px",
      24: "24px",
      30: "30px",
      32: "32px",
      36: "36px",
      44: "44px",
      52: "52px",
      56: "56px",
    },
  },
  corePlugins: {
    borderOpacity: false,
  },
};
