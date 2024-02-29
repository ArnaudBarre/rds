import { logEsbuildErrors } from "@arnaud-barre/config-loader";
import { buildSync } from "esbuild";
import type { ResolvedConfig } from "./loadConfig.ts";

export const bundleWorker = (opts: {
  path: string;
  minify: boolean;
  config: ResolvedConfig;
}) => {
  try {
    const result = buildSync({
      entryPoints: [opts.path],
      bundle: true,
      metafile: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: opts.config.build.target,
      minify: opts.minify,
      define: opts.config.define,
    });
    logEsbuildErrors(result);
    console.log(opts.path, Object.keys(result.metafile.inputs));
    return {
      inputs: Object.keys(result.metafile.inputs),
      code: `export default URL.createObjectURL(new Blob([${JSON.stringify(
        result.outputFiles[0].text,
      )}], { type: "text/javascript" }));`,
    };
  } catch {
    // esbuild has already logged perfect errors, no need to add anything
    process.exit(1);
  }
};
