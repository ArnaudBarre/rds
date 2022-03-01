import { log } from "../logger";
import { mapObjectValue } from "../utils";
import { ResolvedCSSConfig } from "./types";
import { baseTheme } from "./theme/baseTheme";
import {
  ResolvedTheme,
  ThemeKey,
  ThemeValueCallbackOptions,
} from "./theme/types";

const start = performance.now();

const theme = { ...baseTheme }; // TODO: Merge with config
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
const themeValueCallbackOptions: ThemeValueCallbackOptions = {
  theme: (key) => {
    if (key === "fontSize") {
      return mapObjectValue(theme.fontSize, (v) =>
        typeof v === "string" ? v : v[0],
      );
    }
    if (key === "colors") return theme.colors as Record<string, string>;
    const value = theme[key];
    if (typeof value === "object") return value;
    return value(themeValueCallbackOptions);
  },
};
for (const key in theme) {
  const value = theme[key as ThemeKey];
  if (typeof value === "function") {
    // @ts-ignore
    theme[key] =
      // Avoid being under ts-ignore
      value(themeValueCallbackOptions);
  }
}

export const cssConfig: ResolvedCSSConfig = {
  theme: theme as ResolvedTheme,
  corePlugins: {},
  plugins: [],
};
log.debug(`Load CSS config: ${Math.round(performance.now() - start)}ms`);
