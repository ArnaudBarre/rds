import { cache, getHashedUrl, readFile } from "./utils";
import { svgToJS } from "./svgToJS";
import { DEPENDENCY_PREFIX } from "./consts";
import { dependenciesCache } from "./dependencies";

export const svgCache = cache("svg", (url) =>
  svgToJS(
    readFile(url),
    `import __rds_react_jsx_dev_runtime from "${getHashedUrl(
      `${DEPENDENCY_PREFIX}/react/jsx-dev-runtime`,
      dependenciesCache.get("react/jsx-dev-runtime"),
    )}";`,
    "__rds_react_jsx_dev_runtime.jsxDEV",
  ),
);
