module.exports = {
  root: true,
  extends: ["@arnaud-barre"],
  rules: {
    "require-unicode-regexp": "off",
    "@typescript-eslint/no-require-imports": "off",
    "no-param-reassign": "off",
  },
  overrides: [
    {
      files: "src/types/client.d.ts",
      rules: {
        "import/no-unresolved": "off",
        "import/no-default-export": "off",
      },
    },
  ],
};
