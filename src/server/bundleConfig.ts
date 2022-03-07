import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { build } from "esbuild";

import { cacheDir, getHash, jsonCacheSync } from "./utils";
import { log } from "./logger";

type ConfigHashesCache = { files: [path: string, hash: string][] };

export const getConfig = async <Config>(
  name: string,
): Promise<Config | undefined> => {
  const path = `${name}.config.ts`;
  const output = join(cacheDir, `${name}-config.js`);
  if (!existsSync(path)) {
    log.debug(`${path} not found`);
    return;
  }
  const cache = jsonCacheSync<ConfigHashesCache>(`${name}-config`, 1);
  const files = cache.read()?.files;
  if (
    !files ||
    files.some(([path, hash]) => getHash(readFileSync(path)) !== hash)
  ) {
    if (files) log.debug(`${name} config files changed`);
    const result = await build({
      entryPoints: [path],
      outfile: output,
      metafile: true,
      bundle: true,
      platform: "node",
    });
    log.esbuildResult(result);
    cache.write({
      files: Object.keys(result.metafile!.inputs).map((path) => [
        path,
        getHash(readFileSync(path)),
      ]),
    });
  }

  const module = require(join(process.cwd(), output));
  if (!module.config) throw new Error(`${path} doesn't have a "config" export`);
  return module.config;
};
