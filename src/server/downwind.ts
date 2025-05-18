import { readFileSync } from "node:fs";
import { DownwindError, initDownwind } from "@arnaud-barre/downwind";
import { watch } from "chokidar";
import {
  type CSSModuleExports,
  type Dependency,
  type Targets,
  transform,
} from "lightningcss";
import { cache } from "./cache.ts";
import { colors } from "./colors.ts";
import { RDS_CLIENT } from "./consts.ts";
import { codeToFrame, getFrameForLine, RDSError } from "./errors.ts";
import { debugNow, logger } from "./logger.ts";
import { resolve } from "./resolve.ts";
import { run } from "./utils.ts";

export type Downwind = Awaited<ReturnType<typeof getDownwind>>;
export type CSSImport = [raw: string, resolvedUrl: string, placeholder: string];

export const getDownwind = async (target: string[]) => {
  const targets = convertTargets(target);
  const downwind = { current: await initDownwind() };
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
    const hasNew = downwind.current.scan(readFileSync(url, "utf-8"));
    if (hasNew) invalidate("hmr");
  });
  const transformCache = cache("cssTransform", (url) => {
    const {
      code: _code,
      exports,
      dependencies,
      invalidateUtils,
    } = run(() => {
      try {
        const preTransform = downwind.current.preTransformCSS(
          readFileSync(url, "utf-8"),
        );
        const result = transform({
          filename: url,
          code: Buffer.from(preTransform.code),
          analyzeDependencies: true,
          cssModules: url.endsWith(".module.css"),
          targets,
        });
        return {
          invalidateUtils: preTransform.invalidateUtils,
          code: result.code.toString(),
          exports: result.exports
            ? // https://github.com/parcel-bundler/lightningcss/issues/291
              Object.fromEntries(
                Object.entries(result.exports).sort((a, b) =>
                  a[0].localeCompare(b[0]),
                ),
              )
            : undefined,
          dependencies: result.dependencies as Dependency[],
        };
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
            frame: getFrameForLine(error.source, error.loc.line),
          });
        }
        throw error;
      }
    });
    if (invalidateUtils) invalidate("hmr");

    let code = _code;
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
      if (d.url.startsWith("http")) {
        code = code.replace(d.placeholder, d.url);
        continue;
      }
      imports.push([d.url, resolve(url, d.url), d.placeholder]);
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
    downwind.current = await initDownwind();
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
      utils ??= downwind.current.generate();
      return cssToHMR("virtual:@downwind/utils.css", utils, undefined);
    },
    devtoolsScan: (classes: string[]) => {
      const hasNew = downwind.current.scan(` ${classes.join(" ")} `);
      if (hasNew) invalidate("devtools");
    },
    devtoolsGenerate: () =>
      cssToHMR(
        "virtual:@downwind/devtools",
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
) => `import { updateStyle } from "/${RDS_CLIENT}";
updateStyle("${url}", ${JSON.stringify(code)});
${exports ? cssModuleToJS(exports) : ""}`;

const isLightningCSSError = (
  e: any,
): e is {
  message: string;
  source: string;
  loc: { line: number; column: number };
} => "loc" in e;

const cssModuleToJS = (cssModule: CSSModuleExports) => {
  let namedExport = "";
  let defaultExport = "export default {\n";
  for (const key in cssModule) {
    if (!key.includes("-")) {
      namedExport += `export const ${key} = "${cssModule[key].name}";\n`;
      defaultExport += `  ${key},\n`;
    } else {
      defaultExport += `  "${key}": "${cssModule[key].name}",\n`;
    }
  }
  defaultExport += "};";
  return namedExport + defaultExport;
};

// Convert https://esbuild.github.io/api/#target
// To https://github.com/parcel-bundler/lightningcss/blob/master/node/targets.d.ts

const map: Record<string, keyof Targets | null | undefined> = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  hermes: null,
  ie: "ie",
  ios: "ios_saf",
  node: null,
  opera: "opera",
  rhino: null,
  safari: "safari",
};

// From https://github.com/evanw/esbuild/issues/121#issuecomment-646956379
const esMap: Record<number, string[]> = {
  2015: ["chrome49", "safari10.1", "firefox45", "edge14"],
  2016: ["chrome52", "safari10.1", "firefox52", "edge14"],
  2017: ["chrome55", "safari10.1", "firefox52", "edge15"],
  2018: ["chrome60", "safari11.1", "firefox55", "edge79"],
  2019: ["chrome66", "safari11.1", "firefox58", "edge79"],
  2020: ["chrome80", "safari13.1", "firefox72", "edge80"],
};

const esRE = /es(\d{4})/;
const versionRE = /\d/;

// Without targets, nesting is not transformed,
// which will fail because it's not implemented anywhere for now
/* eslint-disable no-bitwise */
const forceDownlevelNesting: Targets = { chrome: 104 << 16 };

const convertTargets = (
  esbuildTarget: string | string[] | undefined | false,
): Targets => {
  if (!esbuildTarget) return forceDownlevelNesting;

  const targets: Targets = {};

  const list = Array.isArray(esbuildTarget) ? esbuildTarget : [esbuildTarget];
  const entriesWithoutES = list.flatMap((e) => {
    const match = e.match(esRE);
    return match ? esMap[Math.min(Number(match[1]), 2020)] : e;
  });

  for (const entry of entriesWithoutES) {
    if (entry === "esnext") continue;
    const index = entry.match(versionRE)?.index;
    if (index) {
      const browser = map[entry.slice(0, index)];
      if (browser === null) continue; // No mapping available
      if (browser) {
        const [major, minor = 0] = entry
          .slice(index)
          .split(".")
          .map((v) => parseInt(v, 10));
        if (!isNaN(major) && !isNaN(minor)) {
          const version = (major << 16) | (minor << 8);
          if (!targets[browser] || version < targets[browser]) {
            targets[browser] = version;
          }
          continue;
        }
      }
    }
    throw new Error(`Unsupported target entry ${entry}`);
  }

  return Object.keys(targets).length ? targets : forceDownlevelNesting;
};
