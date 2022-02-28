import { Rule, StaticRule } from "./types";
import { getCSSConfig } from "./getCSSConfig";
import { getRules } from "./rules/all";

const config = getCSSConfig();
const dynamicContext = { config, theme: config.theme };
export const rules = getRules(config);

type RuleMatch = [ruleIndex: number, input: string];

export const matchToCSSObject = ([index, token]: RuleMatch) => {
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

const isStaticRule = (rule: Rule): rule is StaticRule => rule[0] === "string";
