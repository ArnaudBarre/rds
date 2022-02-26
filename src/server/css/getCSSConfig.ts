import { ResolvedCSSConfig } from "./types";
import { baseTheme } from "./baseTheme";
import { log } from "../logger";

export const getCSSConfig = () => {
  const start = performance.now();
  const resolvedConfig: ResolvedCSSConfig = {
    theme: {
      ...baseTheme,
      colors: Object.fromEntries(
        Object.entries(baseTheme.colors).flatMap(([key, stringOrMap]) =>
          typeof stringOrMap === "string"
            ? [[key, stringOrMap]]
            : Object.entries(stringOrMap).map(([subKey, value]) => [
                `${key}-${subKey}`,
                value,
              ]),
        ),
      ),
    },
  };
  log.debug(`Load CSS config: ${Math.round(performance.now() - start)}ms`);
  return resolvedConfig;
};
