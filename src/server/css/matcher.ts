import { CSSObject, Rule, RuleMeta, StaticRule } from "./types";
import { cssConfig } from "./cssConfig";
import { rules } from "./rules";

const dynamicContext = { config: cssConfig, theme: cssConfig.theme };

type RuleMatch = [ruleIndex: number, input: string];

export const matchToCSSObject = ([index, token]: RuleMatch): CSSObject => {
  const rule = rules[index];
  return isStaticRule(rule)
    ? rule[1]
    : rule[2](token.match(rule[0])!.slice(1), dynamicContext);
};

export const getRuleIndexMatch = (token: string): number | undefined => {
  for (const [index, rule] of rules.entries()) {
    if (isStaticRule(rule)) {
      if (token === rule[0]) return index;
    } else {
      const match = token.match(rule[0]);
      if (match && rule[1](match.slice(1), dynamicContext)) return index;
    }
  }
};

export const isStaticRule = (rule: Rule): rule is StaticRule =>
  rule[0] === "string";

export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isStaticRule(rule) ? rule[2] : rule[3];
