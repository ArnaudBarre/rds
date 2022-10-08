import {
  convertTargets,
  cssModuleToJS,
  initDownwind,
  DownwindError,
} from "@arnaud-barre/downwind";
import { Dependency, CSSModuleExports } from "lightningcss";

import { cache } from "./cache";
import { run } from "./utils";
import { codeToFrame, RDSError } from "./errors";
import { resolve } from "./resolve";
import { clientUrl } from "./client";

export type Downwind = Awaited<ReturnType<typeof getDownwind>>;
export type CSSImport = [resolvedUrl: string, placeholder: string];

export const getDownwind = async (target: string[]) => {
  const downwind = await initDownwind({
    targets: convertTargets(target),
  });
  const base = downwind.getBase();
  let utilsUpdateCallback: (() => void) | undefined;
  let utils: string | undefined;
  const generate = (): string => {
    if (!utils) utils = downwind.generate();
    return cssToHMR("virtual:@downwind/utils.css", utils, undefined);
  };
  const invalidate = () => {
    utils = undefined;
    utilsUpdateCallback?.();
  };

  return {
    getBase: () => cssToHMR("virtual:@downwind/base.css", base, undefined),
    scanCache: cache("cssScan", (url) => {
      const isNew = downwind.scan(url);
      if (isNew) invalidate();
    }),
    transformCache: cache("cssTransform", (url) => {
      const { code, exports, dependencies, invalidateUtils } = run(() => {
        try {
          return downwind.transform(url, { analyzeDependencies: true });
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
      if (invalidateUtils) invalidate();

      return {
        code: cssToHMR(url, code, exports),
        imports: dependencies.map(
          (d): CSSImport => [resolve(url, d.url), getPlaceholder(d)],
        ),
        selfUpdate: !exports, // Can't self accept because of modules exports
      };
    }),
    generate,
    onUtilsUpdate: (callback: () => void) => {
      utilsUpdateCallback = callback;
    },
  };
};

const cssToHMR = (
  url: string,
  code: string,
  exports: CSSModuleExports | undefined,
) => `import { updateStyle } from "${clientUrl}";
updateStyle("${url}", ${JSON.stringify(code)});
${exports ? cssModuleToJS(exports) : ""}`;

const getPlaceholder = (dependency: Dependency) => {
  if (dependency.type === "import") {
    throw new RDSError({
      message: "CSS imports are not supported",
      file: `${dependency.loc.filePath}:${dependency.loc.start.line}:${dependency.loc.start.column}`,
      frame: codeToFrame(
        `@import "${dependency.url}";`,
        dependency.loc.start.line,
      ),
    });
  }
  return dependency.placeholder;
};

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
