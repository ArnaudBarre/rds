module.exports = {
  root: true,
  extends: ["@arnaud-barre"],
  parserOptions: {
    project: ["./tsconfig.json", "./src/client/tsconfig.json"],
  },
  rules: {
    "require-unicode-regexp": "off",
    "no-param-reassign": "off",
  },
  overrides: [
    {
      files: "src/client.d.ts",
      rules: {
        "@arnaud-barre/no-default-export": "off",
      },
    },
  ],
};
