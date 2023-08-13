import { cache } from "./cache.ts";
import { DEPENDENCY_PREFIX } from "./consts.ts";
import { dependenciesCache } from "./dependencies.ts";
import { svgToJS } from "./svgToJS.ts";
import { getHashedUrl, readFile } from "./utils.ts";

export const svgCache = cache("svg", (url) =>
  svgToJS(
    readFile(url),
    `import __rds_react_jsx_dev_runtime from "${getHashedUrl(
      `${DEPENDENCY_PREFIX}/react/jsx-dev-runtime`,
      dependenciesCache.get("react/jsx-dev-runtime"),
    )}";`,
    "__rds_react_jsx_dev_runtime.jsxDEV",
    `import __rds_react from "${getHashedUrl(
      `${DEPENDENCY_PREFIX}/react`,
      dependenciesCache.get("react"),
    )}";`,
    "__rds_react.forwardRef",
  ),
);
