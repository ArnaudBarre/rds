import {
  convertTargets,
  cssModuleToJS,
  DownwindError,
  initDownwind,
} from "@arnaud-barre/downwind";
import { watch } from "chokidar";
import type { CSSModuleExports } from "lightningcss";
import { cache } from "./cache.ts";
import { clientUrl } from "./client.ts";
import { colors } from "./colors.ts";
import { codeToFrame, RDSError } from "./errors.ts";
import { debugNow, logger } from "./logger.ts";
import { resolve } from "./resolve.ts";
import { run } from "./utils.ts";

export type Downwind = Awaited<ReturnType<typeof getDownwind>>;
export type CSSImport = [resolvedUrl: string, placeholder: string];

export const getDownwind = async (target: string[]) => {
  const targets = convertTargets(target);
  const downwind = { current: await initDownwind({ targets }) };
  let base = downwind.current.getBase();
  let updating = false;
  let utilsUpdateCallback: ((from: "hmr" | "devtools") => void) | undefined;
  let utils: string | undefined;
  const invalidate = (from: "hmr" | "devtools") => {
    if (updating) return;
    utils = undefined;
    utilsUpdateCallback?.(from);
  };

  const scanCache = cache("cssScan", (url) => {
    const hasNew = downwind.current.scan(url);
    if (hasNew) invalidate("hmr");
  });
  const transformCache = cache("cssTransform", (url) => {
    const { code, exports, dependencies, invalidateUtils } = run(() => {
      try {
        return downwind.current.transform(url, { analyzeDependencies: true });
      } catch (error) {
        if (error instanceof DownwindError) {
          throw new RDSError({
            message: error.message,
            file: url,
            frame: codeToFrame(error.context, null),
          });
        }
        if (isLightningCSSError(error)) {
          throw new RDSError({
            message: error.message,
            file: `${url}:${error.loc.line}:${error.loc.column}`,
            frame: getFrame(error.source, error.loc.line),
          });
        }
        throw error;
      }
    });
    if (invalidateUtils) invalidate("hmr");

    const imports: CSSImport[] = [];
    for (const d of dependencies) {
      if (d.type === "import") {
        throw new RDSError({
          message: "CSS imports are not supported",
          file: `${d.loc.filePath}:${d.loc.start.line}:${d.loc.start.column}`,
          frame: codeToFrame(`@import "${d.url}";`, d.loc.start.line),
        });
      }
      if (d.url.startsWith("data:")) continue;
      imports.push([resolve(url, d.url), d.placeholder]);
    }

    return {
      code: cssToHMR(url, code, exports),
      imports,
      selfUpdate: !exports, // Can't self accept because of modules exports
    };
  });

  let reloadCallback: ((changedCSS: string[]) => void) | undefined;
  const configWatcher = watch(
    downwind.current.configFiles.length
      ? downwind.current.configFiles
      : ["downwind.config.ts"],
    { ignoreInitial: true },
  ).on("change", async () => {
    const start = debugNow();
    logger.info(colors.green("Downwind config changed, updating..."));
    const previousConfigFiles = downwind.current.configFiles;
    // eslint-disable-next-line require-atomic-updates
    downwind.current = await initDownwind({ targets });
    base = downwind.current.getBase();
    configWatcher.unwatch(
      previousConfigFiles.filter(
        (f) => !downwind.current.configFiles.includes(f),
      ),
    );
    configWatcher.add(
      downwind.current.configFiles.filter(
        (f) => !previousConfigFiles.includes(f),
      ),
    );
    scanCache.clear();
    const changedCSS = transformCache.reload(
      (prev, next) => prev.code !== next.code,
    );
    updating = true;
    reloadCallback?.(changedCSS);
    updating = false;
    invalidate("hmr");
    logger.debug(
      `Downwind config updated in ${Math.round(performance.now() - start)}ms`,
    );
  });

  return {
    getBase: () => cssToHMR("virtual:@downwind/base.css", base, undefined),
    scanCache,
    transformCache,
    generate: (): string => {
      if (!utils) utils = downwind.current.generate();
      return cssToHMR("virtual:@downwind/utils.css", utils, undefined);
    },
    devtoolsScan: (classes: string[]) => {
      const hasNew = downwind.current.scan(
        "devtools-update",
        `@downwind-scan ${classes.join(" ")}`,
      );
      if (hasNew) invalidate("devtools");
    },
    devtoolsGenerate: () =>
      cssToHMR(
        "virtual:@downwind/devtools.css",
        downwind.current.codegen({ mode: "DEVTOOLS" }),
        undefined,
      ),
    onReload: (callback: (changedCSS: string[]) => void) => {
      reloadCallback = callback;
    },
    onUtilsUpdate: (callback: (from: "hmr" | "devtools") => void) => {
      utilsUpdateCallback = callback;
    },
    closeConfigWatcher: () => configWatcher.close(),
  };
};

const cssToHMR = (
  url: string,
  code: string,
  exports: CSSModuleExports | undefined,
) => `import { updateStyle } from "${clientUrl}";
updateStyle("${url}", ${JSON.stringify(code)});
${exports ? cssModuleToJS(exports) : ""}`;

const isLightningCSSError = (
  e: any,
): e is {
  message: string;
  source: string;
  loc: { line: number; column: number };
} => "loc" in e;

const getFrame = (code: string, line: number) => {
  let index = 0;
  let currentLine = 1;
  while (currentLine !== line) {
    index = code.indexOf("\n", index) + 1;
    currentLine++;
  }
  return codeToFrame(code.slice(index, code.indexOf("\n", index)), line);
};
