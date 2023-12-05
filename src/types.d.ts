import type { DefineConfig } from "@arnaud-barre/config-loader";

type UserConfig = {
  server?: {
    /**
     * Specify server port. Note if the port is already being used, RDS will automatically try
     * the next available port so this may not be the actual port the server ends up listening on.
     * --port <number> in CLI
     * @default 3000
     */
    port?: number;
    /**
     * Set to true to exit if port is already in use, instead of automatically trying the next available port.
     * @default false
     */
    strictPort?: boolean;
    /**
     * Automatically open the app in the browser on server start.
     * Only works for Chrome on Mac.
     * --open in CLI
     * @default false
     */
    open?: boolean;
    /**
     * Set to true to listen on all addresses, including LAN and public addresses.
     * --host in CLI
     * @default false
     */
    host?: boolean;
    /**
     * When host is true, prints a QR code for the first non-local address.
     * --qr in CLI
     * @default false
     */
    qrCode?: boolean;
    /**
     * Option for the eslint worker (start only)
     * @default { cache: true; fix: false }
     */
    eslint?: { cache?: boolean; fix?: boolean };
    /**
     * If set, configure where /api/* requests are redirect
     */
    proxy?: {
      target: string;
      pathRewrite?: (url: string) => string;
      headersRewrite?: (
        headers: Record<string, string | string[] | undefined>,
      ) => Record<string, string | string[] | undefined>;
    };
  };
  /**
   * Define global constant replacements.
   * process.env.NODE_ENV will be set to "development" in dev and "production" during build.
   */
  define?: Record<string, string>;
  build?: {
    /** @default true */
    emptyOutDir?: boolean;
    /**
     * Documentation: https://esbuild.github.io/api/#target
     * @default ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13'] (same as Vite)
     */
    target?: string[];
    /**
     * Adds metafile to dist output. Can then be visualized in https://esbuild.github.io/analyze/
     * @default false
     */
    metafile?: boolean;
    /**
     * Pass to downwind, number of millisecond to wait without new scan before generating utils
     */
    downwindIntervalCheckMs?: number;
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
