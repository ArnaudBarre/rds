import baseConfig from "@arnaud-barre/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...baseConfig,
  {
    rules: {
      "require-unicode-regexp": "off",
      "no-param-reassign": "off",
    },
  },
  {
    files: ["src/client.d.ts"],
    rules: {
      "@arnaud-barre/no-default-export": "off",
    },
  },
);
