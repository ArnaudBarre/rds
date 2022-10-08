import { join } from "path";
import { transformFileSync } from "@swc/core";
import { init } from "es-module-lexer";

import { cacheDir, readFile, readFileAsync } from "./utils";
import { ResolvedConfig } from "./loadConfig";
import { codeToFrame, RDSError } from "./errors";
import { debugNow, logger } from "./logger";
import { JSImport, scanImports } from "./scanImports";
import { RDS_CLIENT } from "./consts";
import { jsonCache } from "@arnaud-barre/config-loader";
import {
  readdirSync,
  writeFileSync,
  promises,
  existsSync,
  mkdirSync,
} from "fs";

export type SWCCache = Awaited<ReturnType<typeof initSWC>>;

const swcCachePath = join(cacheDir, "swcCache");
type SWCOutput = {
  code: string;
  input: string;
  imports: JSImport[];
  selfUpdate: boolean;
};

export const initSWC = async (config: ResolvedConfig) => {
  if (!existsSync(swcCachePath)) mkdirSync(swcCachePath);
  const mainCache = jsonCache<{
    define: Record<string, string>;
  }>(join(swcCachePath, "main.json"), 1);
  const start = debugNow();
  const transformations: Record<string, SWCOutput | undefined> = {};
  const toCachePah = (url: string) =>
    `${swcCachePath}/${url.replaceAll("/", "|")}.json`;

  const get = (url: string, withCache: boolean): SWCOutput => {
    logger.debug(`swc: get - ${url} ${withCache ? "with cache" : "no cache"}`);
    const cached = withCache && transformations[url];
    if (cached) return cached;

    const startGet = debugNow();
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
      // eslint-disable-next-line no-control-regex
      const rawMessage = err.message.replace(/\u001b\[.*?m/g, "");
      const messageIndex = rawMessage.indexOf("×");
      const fileIndex = rawMessage.indexOf("╭─[");
      const codeStartIndex = rawMessage.indexOf(" │ ");
      if (messageIndex !== -1 && fileIndex !== -1 && codeStartIndex !== -1) {
        const file = rawMessage.slice(
          fileIndex + 3,
          rawMessage.indexOf("]", fileIndex),
        );
        const lineIndex = file.indexOf(":");
        throw new RDSError({
          message: rawMessage.slice(
            messageIndex + 2,
            rawMessage.indexOf("\n", messageIndex),
          ),
          file,
          frame: codeToFrame(
            rawMessage.slice(
              codeStartIndex + 3,
              rawMessage.indexOf("\n", codeStartIndex),
            ),
            lineIndex === -1 ? null : Number(file.split(":")[1]),
          ),
        });
      }
      throw new RDSError({ message: err.message, file: url });
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
    logger.debug(`swc: load - ${url}: ${Math.round(debugNow() - startGet)}ms`);
    transformations[url] = output;
    writeFileSync(toCachePah(url), JSON.stringify(output));
    return output;
  };

  const previousCache = mainCache.read();
  if (previousCache) {
    const allDefineKeys = [
      ...new Set([
        ...Object.keys(previousCache.define),
        ...Object.keys(config.define),
      ]),
    ];
    let definedHasChanged = false;
    for (const key of allDefineKeys) {
      if (previousCache.define[key] !== config.define[key]) {
        definedHasChanged = true;
        break;
      }
    }
    const contents = await Promise.all(
      readdirSync(swcCachePath)
        .filter((f) => f.endsWith(".json") && f !== "main.json")
        .map((f) => {
          const path = f.replaceAll("|", "/").slice(0, -5);
          return Promise.all([
            path,
            readFileAsync(path).catch(() => null),
            readFileAsync(`${swcCachePath}/${f}`),
          ]);
        }),
    );
    for (const [path, content, json] of contents) {
      const previous = JSON.parse(json) as SWCOutput;
      if (
        content &&
        previous.input === content &&
        (!definedHasChanged ||
          !allDefineKeys.some(
            (key) =>
              content.includes(key) &&
              previousCache.define[key] !== config.define[key],
          ))
      ) {
        transformations[path] = previous;
      }
    }
    logger.debug(`Load SWC fs cache: ${(debugNow() - start).toFixed(2)}ms`);
  }
  mainCache.write({ define: config.define });

  await init;

  return {
    get,
    update: (url: string): boolean /* Output changed */ => {
      const previous = stripSourceMap(transformations[url]!.code);
      const newOutput = get(url, false);
      return stripSourceMap(newOutput.code) !== previous;
    },
    delete: (url: string) => {
      logger.debug(`swc: delete - ${url}`);
      promises.rm(toCachePah(url));
    },
  };
};

const isError = (err: any): err is Error => err.message;

const stripSourceMap = (code: string) =>
  code.slice(0, code.indexOf("//# sourceMappingURL"));
