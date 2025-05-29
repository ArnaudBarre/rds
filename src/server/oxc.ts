import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { jsonCache } from "@arnaud-barre/config-loader";
import { init } from "es-module-lexer";
import { transform } from "oxc-transform";
import { RDS_CLIENT } from "./consts.ts";
import { codeToFrame, RDSError } from "./errors.ts";
import type { ResolvedConfig } from "./loadConfig.ts";
import { debugNow, logger } from "./logger.ts";
import { type JSImport, scanImports } from "./scanImports.ts";
import { cacheDir, readFile, readFileAsync, run } from "./utils.ts";

export type OXCCache = Awaited<ReturnType<typeof initOXC>>;

const oxcCachePath = join(cacheDir, "oxcCache");
type OXCOutput = {
  code: string;
  input: string;
  imports: JSImport[];
  selfUpdate: boolean;
};

export const initOXC = async (config: ResolvedConfig) => {
  if (!existsSync(oxcCachePath)) mkdirSync(oxcCachePath);
  const mainCache = jsonCache<{
    define: Record<string, string>;
  }>(join(oxcCachePath, "main.json"), `1-${__OXC_VERSION__}`);
  const start = debugNow();
  const transformations: Record<string, OXCOutput | undefined> = {};
  const toCachePah = (url: string) =>
    `${oxcCachePath}/${url.replaceAll("/", "|")}.json`;

  const get = (url: string, withCache: boolean): OXCOutput => {
    logger.debug(`oxc: get - ${url} ${withCache ? "with cache" : "no cache"}`);
    const cached = withCache && transformations[url];
    if (cached) return cached;
    const content = readFileSync(url, "utf-8");
    const startGet = debugNow();
    const transformed = run(() => {
      try {
        return transform(`/@fs/${url}`, content, {
          sourcemap: true,
          jsx: { refresh: true, development: true, runtime: "automatic" },
          define: {
            "process.env.NODE_ENV": '"development"',
            ...config.define,
          },
        });
      } catch (err) {
        if (!isError(err)) throw err;
        // eslint-disable-next-line no-control-regex
        const rawMessage = err.message.replaceAll(/\u001b\[.*?m/g, "");
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
    });

    const hasFastRefresh = transformed.code.includes("$RefreshReg$");
    const code = run(() => {
      if (!hasFastRefresh) {
        return inlineSourceMap(
          transformed.code,
          JSON.stringify(transformed.map!),
        );
      }
      const header = `import { RefreshRuntime } from "${RDS_CLIENT}";
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${url}");
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

`;
      const footer = `
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
RefreshRuntime.enqueueUpdate();
`;
      transformed.map!.mappings = `;;;;;;${transformed.map!.mappings}`;
      return inlineSourceMap(
        header + transformed.code + footer,
        JSON.stringify(transformed.map!),
      );
    });
    const output: OXCOutput = {
      code,
      input: readFile(url),
      imports: scanImports(url, code),
      selfUpdate: hasFastRefresh,
    };
    logger.debug(`oxc: load - ${url}: ${Math.round(debugNow() - startGet)}ms`);
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
      readdirSync(oxcCachePath)
        .filter((f) => f.endsWith(".json") && f !== "main.json")
        .map((f) => {
          const path = f.replaceAll("|", "/").slice(0, -5);
          return Promise.all([
            path,
            readFileAsync(path).catch(() => null),
            readFileAsync(`${oxcCachePath}/${f}`),
          ]);
        }),
    );
    for (const [path, content, json] of contents) {
      const previous = JSON.parse(json) as OXCOutput;
      if (
        content
        && previous.input === content
        && (!definedHasChanged
          || !allDefineKeys.some(
            (key) =>
              content.includes(key)
              && previousCache.define[key] !== config.define[key],
          ))
      ) {
        transformations[path] = previous;
      }
    }
    logger.debug(`Load OXC fs cache: ${(debugNow() - start).toFixed(2)}ms`);
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
      logger.debug(`oxc: delete - ${url}`);
      rmSync(toCachePah(url));
    },
  };
};

const isError = (err: any): err is Error => err.message;

const stripSourceMap = (code: string) =>
  code.slice(0, code.indexOf("//# sourceMappingURL"));

const inlineSourceMap = (code: string, map: string) =>
  `${code}
//# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString(
    "base64",
  )}`;
