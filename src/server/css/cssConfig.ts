import { log } from "../logger";
import { getConfig } from "../bundleConfig";
import { mapObjectValue } from "../utils";
import { CSSConfig, ResolvedCSSConfig } from "./types";
import { baseTheme } from "./theme/baseTheme";
import {
  BaseTheme,
  ResolvedTheme,
  ThemeCallback,
  ThemeKey,
} from "./theme/types";

const start = performance.now();

const config = getConfig<CSSConfig>("css");
const theme = ((): BaseTheme => {
  if (!config?.theme) return baseTheme;
  const { extend, ...userTheme } = config.theme;
  if (extend) {
    for (const key in extend) {
      // @ts-ignore
      if (extend[key]) baseTheme[key] = { ...baseTheme[key], ...extend[key] };
    }
  }
  return Object.assign(baseTheme, userTheme);
})();
theme.colors = Object.fromEntries(
  Object.entries(theme.colors).flatMap(([key, stringOrMap]) =>
    typeof stringOrMap === "string"
      ? [[key, stringOrMap]]
      : Object.entries(stringOrMap).map(([subKey, value]) => [
          `${key}-${subKey}`,
          value,
        ]),
  ),
);
theme.screens = mapObjectValue(theme.screens, (stringOrObj) =>
  typeof stringOrObj === "string" ? { min: stringOrObj } : stringOrObj,
);
const themeCallback: ThemeCallback = (key) => {
  if (key === "screens") return theme.screens as any;
  if (key === "fontSize") {
    return mapObjectValue(theme.fontSize, (v) =>
      typeof v === "string" ? v : v[0],
    );
  }
  if (key === "colors") return theme.colors as Record<string, string>;
  const value = theme[key];
  if (typeof value === "object") return value;
  return value(themeCallback);
};
for (const key in theme) {
  const value = theme[key as ThemeKey];
  if (typeof value === "function") {
    // @ts-ignore
    theme[key] =
      // Avoid being under ts-ignore
      value(themeCallback);
  }
}

export const cssConfig: ResolvedCSSConfig = {
  theme: theme as ResolvedTheme,
  corePlugins: config?.corePlugins ?? {},
  plugins:
    typeof config?.plugins === "function"
      ? config.plugins(theme as ResolvedTheme)
      : config?.plugins ?? [],
};
log.debug(`Load CSS config: ${(performance.now() - start).toFixed(2)}ms`);
