import { CSSEntries } from "./types";
import { isDirectionRule, isThemeRule, rulesEntries, RuleEntry } from "./rules";
import { Variant, variantsMap } from "./variants";

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

export const matchToken = (
  token: string,
): { ruleEntry: RuleEntry; variants: Variant[] } | undefined => {
  let index;
  const variants: Variant[] = [];
  while ((index = token.indexOf(":")) !== -1) {
    const prefix = token.slice(0, index);
    const variant = variantsMap.get(prefix);
    if (!variant) return;
    variants.push(variant);
    token = token.slice(index + 1);
  }
  const ruleEntry = rulesEntries.get(token);
  return ruleEntry ? { ruleEntry, variants } : undefined;
};
