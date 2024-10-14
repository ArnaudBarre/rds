import baseConfig from "@arnaud-barre/eslint-config";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./src/client/tsconfig.json"],
      },
    },
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
