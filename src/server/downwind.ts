import { initDownwind, convertTargets } from "@arnaud-barre/downwind";

import { cache, getHashedUrl, run } from "./utils";
import { Dependency } from "@parcel/css";
import { codeToFrame, RDSError } from "./errors";
import { resolve } from "./resolve";
import { cssToHMR } from "./getClient";

export type Downwind = Awaited<ReturnType<typeof getDownwind>>;
export type CSSImport = [resolvedUrl: string, placeholder: string];

export const getDownwind = async (target: string[]) => {
  const downwind = await initDownwind({
    targets: convertTargets(target),
  });
  let utilsUpdateCallback: (() => void) | undefined;
  let utils: string | undefined;
  const generate = (): string => {
    if (!utils) utils = downwind.generate();
    return utils;
  };
  const invalidate = () => {
    utils = undefined;
    utilsUpdateCallback?.();
  };

  return {
    base: downwind.getBase(),
    scanCache: cache("cssScan", (url) => {
      const isNew = downwind.scan(url);
      if (isNew) invalidate();
    }),
    transformCache: cache("cssTransform", (url) => {
      const { code, exports, dependencies, invalidateUtils } = run(() => {
        try {
          return downwind.transform(url, { analyzeDependencies: true });
        } catch (error) {
          const e = error as {
            message: string;
            source: string;
            loc: { line: number; column: number };
          };
          throw new RDSError({
            message: e.message,
            file: `${url}:${e.loc.line}:${e.loc.column}`,
            frame: getFrame(code, e.loc.line),
          });
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
    getHashedCSSUtilsUrl: () =>
      getHashedUrl("virtual:@downwind/utils.css", generate()),
    onUtilsUpdate: (callback: () => void) => {
      utilsUpdateCallback = callback;
    },
  };
};

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

const getFrame = (code: string, line: number) => {
  let index = 0;
  let currentLine = 1;
  while (currentLine !== line) {
    index = code.indexOf("\n", index) + 1;
    currentLine++;
  }
  return codeToFrame(code.slice(index, code.indexOf("\n", index)), line);
};
