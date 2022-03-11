import { CSSConfig } from "./css";

export * from "./theme";
export * from "./css";

export type UserConfig = {
  open?: boolean;
  server?: {
    host?: boolean;
    port?: number;
    strictPort?: boolean;
  };
  eslint?: false | { cache?: boolean; fix?: boolean };
};

export type DefineCSSConfig = DefineConfig<CSSConfig>;
export type DefineUserConfig = DefineConfig<UserConfig>;

export type DefineConfig<T> = T | (() => Promise<T>);
