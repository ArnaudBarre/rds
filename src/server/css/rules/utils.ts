import { Rule, SelectorRewrite } from "../types";
import { ResolvedTheme, SimpleThemeKey } from "../theme/types";

export const themeRule = (
  regex: RegExp,
  theme: ResolvedTheme,
  key: SimpleThemeKey,
  property: string,
): Rule => [
  regex,
  ([v]) => !!theme[key][v!],
  ([v]) => ({ [property]: theme[key][v!] }),
];

export const withNegativeThemeRule = (
  regex: RegExp, // should contains direction group
  theme: ResolvedTheme,
  key: SimpleThemeKey,
  getProperties: (d: string | undefined) => string[],
  selectorRewrite?: SelectorRewrite,
): Rule => [
  new RegExp(`^(-)?${regex.source}-(.+)$`),
  ([, , v]) => !!theme[key][v!], // TODO: validate if value is a unit when negative
  ([n = "", d, v]) => {
    const value = n + theme[key][v!];
    return Object.fromEntries(getProperties(d).map((k) => [k, value]));
  },
  selectorRewrite,
];

export const enumRule = (
  prefix: string,
  property: string,
  values: string[],
  transformValue: (value: string) => string = (v) => v,
): Rule => [
  new RegExp(`^${prefix}(${values.join("|")})$`),
  () => true,
  ([v]) => ({ [property]: transformValue(v!) }),
];
