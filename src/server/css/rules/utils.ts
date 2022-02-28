import { Rule, SelectorRewrite } from "../types";

export const themeRule = (
  prefix: string,
  themeMap: Record<string, string>,
  property: string,
  selectorRewrite?: SelectorRewrite,
): Rule => [
  new RegExp(`^${prefix}(-(.+))?$`),
  ([, v = "DEFAULT"]) => !!themeMap[v!],
  ([, v = "DEFAULT"]) => ({ [property]: themeMap[v!] }),
  selectorRewrite,
];

export const withDirectionThemeRule = (
  regex: RegExp, // should contains direction group
  themeMap: Record<string, string>,
  getProperties: (d: string | undefined) => string[],
  options?: {
    selectorRewrite?: SelectorRewrite;
    supportsNegativeValues: boolean;
  },
): Rule => [
  new RegExp(
    `^${options?.supportsNegativeValues ? "(-)?" : "()"}${regex.source}-(.+)$`,
  ),
  ([, , v]) => !!themeMap[v!], // TODO: validate if value is a unit when negative
  ([n = "", d, v]) => {
    const value = n + themeMap[v!];
    return Object.fromEntries(getProperties(d).map((k) => [k, value]));
  },
  options?.selectorRewrite,
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

export const childSelectorRewrite: SelectorRewrite = (v) => `${v} > * + *`;
