export const RDS_PREFIX = "@rds";
export const RDS_CLIENT = `${RDS_PREFIX}/client`;
export const RDS_OPEN_IN_EDITOR = `${RDS_PREFIX}/open-in-editor`;
export const DEPENDENCY_PREFIX = "@dep";
export const ENTRY_POINT = "src/index.tsx";

// https://github.com/vitejs/vite/blob/main/packages/vite/src/node/constants.ts#L14-L23
export const ESBUILD_MODULES_TARGET = [
  "es2020",
  "edge88",
  "firefox78",
  "chrome87",
  "safari13",
];
