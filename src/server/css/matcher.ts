import { CSSEntries, DynamicContext } from "./types";
import { cssConfig } from "./cssConfig";
import { isStaticRule, rules, map, dynamicRules } from "./rules";

const dynamicContext: DynamicContext = { config: cssConfig };

type RuleMatch = [ruleIndex: number, input: string];

export const matchToCSSEntries = ([index, token]: RuleMatch): CSSEntries => {
  const rule = rules[index];
  return isStaticRule(rule)
    ? rule[1]
    : rule[2](token.match(rule[0])!.slice(1), dynamicContext);
};

export const getRuleIndexMatch = (token: string): number | undefined => {
  const staticMatch = map.get(token);
  if (staticMatch !== undefined) return staticMatch;
  for (const dynamicRule of dynamicRules) {
    const match = token.match(dynamicRule[0][0]);
    if (match && dynamicRule[0][1](match.slice(1), dynamicContext))
      return dynamicRule[1];
  }
};
