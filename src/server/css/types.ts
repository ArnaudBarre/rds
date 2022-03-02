import { BaseTheme, ResolvedTheme } from "./theme/types";
import { CorePlugin } from "./corePlugins";
import { CSSDefault } from "./defaults";

export type ResolvedCSSConfig = {
  theme: ResolvedTheme;
  corePlugins: Partial<Record<CorePlugin, boolean>>;
  plugins: Rule[];
};

export type CSSConfig = Partial<{
  theme: Partial<BaseTheme & { extend: Partial<BaseTheme> }>;
  corePlugins: Partial<Record<CorePlugin, boolean>>;
  plugins: Rule[];
}>;

export type Rule = DynamicRule | StaticRule;
export type DynamicRule = [RegExp, DynamicValidator, DynamicMatcher, RuleMeta?];
export type StaticRule = [string, CSSObject, RuleMeta?];
export type RuleMeta = {
  selectorRewrite?: SelectorRewrite;
  addDefault?: CSSDefault;
  addKeyframes?: boolean;
  components?: boolean; // For plugins
};
export type DynamicValidator = (
  groups: (string | undefined)[],
  context: DynamicContext,
) => boolean;
export type DynamicMatcher = (
  groups: (string | undefined)[],
  context: DynamicContext,
) => CSSObject;
export type SelectorRewrite = (value: string) => string;
export type DynamicContext = Readonly<{ config: ResolvedCSSConfig }>;
export type CSSObject = Record<string, string>;
export type Keyframes = Record<string, CSSObject>;
export type CSSEntries = [string, string | number][];
