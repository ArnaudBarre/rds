export type ResolvedCSSConfig = {
  theme: Theme & { colors: Record<string, string> };
};

export type Theme = {
  colors: Record<string, string | Record<string, string>>;
  spacing: Record<string, string>;
};

export type Rule = DynamicRule | StaticRule;
export type DynamicRule = [RegExp, DynamicValidator, DynamicMatcher];
export type StaticRule = [string, CSSObject];
export type DynamicValidator = (
  groups: (string | undefined)[],
  context: DynamicContext,
) => boolean;
export type DynamicMatcher = (
  groups: (string | undefined)[],
  context: DynamicContext,
) => CSSObject;
type DynamicContext = Readonly<{
  config: ResolvedCSSConfig;
  theme: ResolvedCSSConfig["theme"];
}>;
export type CSSObject = Record<string, string | number>;
export type CSSEntries = [string, string | number][];
