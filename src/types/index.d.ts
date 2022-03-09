export * from "./theme";
export * from "./css";

export type Config = {
  open?: boolean;
  server?: {
    host?: boolean;
    port?: number;
    strictPort?: boolean;
  };
  eslint?: false | { cache?: boolean; fix?: boolean };
};
