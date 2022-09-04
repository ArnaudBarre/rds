import { join } from "path";
import { transformFileSync } from "@swc/core";
import { jsonCache, readMaybeFileSync } from "@arnaud-barre/config-loader";
import { init } from "es-module-lexer";

import { cacheDir, readFile } from "./utils";
import { ResolvedConfig } from "./loadConfig";
import { RDSError } from "./errors";
import { debugNow, logger } from "./logger";
import { JSImport, scanImports } from "./scanImports";
import { RDS_CLIENT } from "./consts";

export type SWCCache = Awaited<ReturnType<typeof initSWC>>;

type SWCOutput = {
  code: string;
  input: string;
  imports: JSImport[];
  selfUpdate: boolean;
};
type Cache = Record<string, SWCOutput | undefined>;

export const initSWC = async (config: ResolvedConfig) => {
  const fsCache = jsonCache<Cache>(join(cacheDir, "swcCache.json"), 1);
  const cache: Cache = {};

  const save = () => {
    fsCache.write(cache);
  };

  const get = (url: string): SWCOutput => {
    logger.debug(`swc: get - ${url}`);
    const cached = cache[url];
    if (cached) return cached;

    const start = debugNow();
    let code: string;
    try {
      code = transformFileSync(url, {
        configFile: false,
        swcrc: false,
        sourceMaps: "inline",
        jsc: {
          target: "es2020",
          transform: {
            react: {
              refresh: true,
              development: true,
              useBuiltins: true,
              runtime: "automatic",
            },
            optimizer: {
              globals: {
                vars: {
                  "process.env.NODE_ENV": '"development"',
                  ...config.define,
                },
              },
            },
          },
        },
      }).code;
    } catch (err) {
      if (!isError(err)) throw err;
      const fileIndex = err.message.indexOf(" -->");
      const frameIndex = err.message.indexOf("  |");
      throw new RDSError({
        message:
          fileIndex === -1
            ? err.message.slice(6, frameIndex).trim()
            : err.message.slice(6, fileIndex).trim(),
        file:
          fileIndex === -1
            ? url
            : err.message.slice(fileIndex + 4, frameIndex).trim(),
        frame: err.message.slice(
          frameIndex,
          err.message.lastIndexOf("  |") + 4,
        ),
      });
    }

    const hasFastRefresh = code.includes("$RefreshReg$");
    code = hasFastRefresh
      ? `import { RefreshRuntime } from "${RDS_CLIENT}";
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${url}")
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${code}

window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
RefreshRuntime.enqueueUpdate();
`
      : code;
    const output: SWCOutput = {
      code,
      input: readFile(url),
      imports: scanImports(url, code),
      selfUpdate: hasFastRefresh,
    };
    logger.debug(`swc: load - ${url}: ${Math.round(debugNow() - start)}ms`);
    cache[url] = output;
    save();
    return output;
  };

  const current = fsCache.read();
  if (current) {
    const start = debugNow();
    for (const path in current) {
      const content = readMaybeFileSync(path);
      if (content && current[path]!.input === content) {
        cache[path] = current[path];
      }
    }
    logger.debug(`Load SWC fs cache: ${(debugNow() - start).toFixed(2)}ms`);
  }

  await init;

  return {
    get,
    update: (url: string) => {
      logger.debug(`swc: update - ${url}`);
      const previous = stripSourceMap(cache[url]!.code);
      cache[url] = undefined;
      const newOutput = get(url);
      return stripSourceMap(newOutput.code) !== previous;
    },
    delete: (url: string) => {
      logger.debug(`swc: delete - ${url}`);
      cache[url] = undefined;
    },
  };
};

const isError = (err: any): err is Error => err.message;

const stripSourceMap = (code: string) =>
  code.slice(0, code.indexOf("//# sourceMappingURL"));
