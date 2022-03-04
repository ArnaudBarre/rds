import { CSSEntries } from "./types";
import {
  isDirectionRule,
  isThemeRule,
  rulesEntries,
  rules,
  RuleEntry,
} from "./rules";

export const ruleEntryToCSSEntries = (ruleEntry: RuleEntry): CSSEntries => {
  const rule = rules[ruleEntry[0]];
  if (isThemeRule(rule)) {
    return rule[2](
      ruleEntry[3] ? `-${rule[1][ruleEntry[1]]}` : rule[1][ruleEntry[1]],
    );
  } else if (isDirectionRule(rule)) {
    return rule[3](
      ruleEntry[2],
      ruleEntry[3] ? `-${rule[2][ruleEntry[1]]}` : rule[2][ruleEntry[1]],
    );
  } else {
    return rule[1];
  }
};

export const matchToken = (token: string): RuleEntry | undefined => {
  return rulesEntries.get(token);
};
