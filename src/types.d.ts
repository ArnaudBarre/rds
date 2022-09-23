import { DefineConfig } from "@arnaud-barre/config-loader";

type UserConfig = {
  server?: {
    host?: boolean /** @default false */;
    port?: number /** @default 3000 */;
    /**
     * Set to true to exit if port is already in use, instead of automatically trying the next available port.
     * @default false
     */
    strictPort?: boolean;
    /**
     * Automatically open the app in the browser on server start.
     * Only works for Chrome on Mac.
     * @default false
     */
    open?: boolean;
    /**
     * Option for the eslint worker (start only)
     * @default { cache: true; fix: false }
     */
    eslint?: { cache?: boolean; fix?: boolean };
    proxy?: {
      target: string;
      pathRewrite?: (url: string) => string;
      headersRewrite?: (
        headers: Record<string, string | string[] | undefined>,
      ) => Record<string, string | string[] | undefined>;
    };
  };
  define?: Record<string, string>;
  build?: {
    emptyOutDir?: boolean /** @default true */;
    /**
     * Documentation: https://esbuild.github.io/api/#target
     * @default ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13'] (same as Vite)
     */
    target?: string[];
  };
};

export type RDSConfig = DefineConfig<UserConfig>;

type InlineConfig = UserConfig & { force?: boolean };

/**
 * Creates and start the development server.
 * inlineConfig is deeply merged with the config file
 * @returns A function to close the server
 */
export declare function createDevServer(
  inlineConfig?: InlineConfig,
): Promise<() => Promise<void>>;

/**
 * Builds the app.
 * inlineConfig is deeply merged with the config file
 */
export declare function build(inlineConfig?: InlineConfig): Promise<void>;

/**
 * Creates and start the preview server for the built app (./dist).
 * inlineConfig is deeply merged with the config file
 * @returns A function to close the server
 */
export declare function createPreviewServer(
  inlineConfig?: InlineConfig,
): Promise<() => void>;
