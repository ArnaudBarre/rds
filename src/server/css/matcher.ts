import { CSSEntries } from "./types";
import { isDirectionRule, isThemeRule, rulesEntries, RuleEntry } from "./rules";

export const ruleEntryToCSSEntries = (ruleEntry: RuleEntry): CSSEntries => {
  const rule = ruleEntry.rule;
  if (isThemeRule(rule)) {
    return rule[2](
      ruleEntry.negative
        ? `-${rule[1][ruleEntry.key]}`
        : rule[1][ruleEntry.key],
    );
  } else if (isDirectionRule(rule)) {
    return rule[3](
      ruleEntry.direction,
      ruleEntry.negative
        ? `-${rule[2][ruleEntry.key]}`
        : rule[2][ruleEntry.key],
    );
  } else {
    return rule[1];
  }
};

export const matchToken = (token: string): RuleEntry | undefined => {
  return rulesEntries.get(token);
};
