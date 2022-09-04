import { DefineConfig } from "@arnaud-barre/config-loader";

type UserConfig = {
  open?: boolean;
  server?: {
    host?: boolean;
    port?: number;
    strictPort?: boolean;
  };
  eslint?: { cache?: boolean; fix?: boolean };
  proxy?: {
    target: string;
    pathRewrite?: (url: string) => string;
    headersRewrite?: (
      headers: Record<string, string | string[] | undefined>,
    ) => Record<string, string | string[] | undefined>;
  };
  define?: Record<string, string>;
  /**
   * Documentation: https://esbuild.github.io/api/#target
   * @default ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13'] (same as Vite)
   */
  target?: string[];
};

export type RDSConfig = DefineConfig<UserConfig>;
