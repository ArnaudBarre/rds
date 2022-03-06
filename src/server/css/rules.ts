import {
  CorePlugin,
  DirectionThemeRule,
  Rule,
  RuleMeta,
  ThemeRule,
  ThemeRuleMeta,
} from "../../types";
import { split } from "../utils";
import { log } from "../logger";
import { getCorePlugins, RuleOrRules } from "./corePlugins";
import { cssConfig } from "./cssConfig";

export const isThemeRule = (rule: Rule): rule is ThemeRule<any> =>
  typeof rule[2] === "function";
export const isDirectionRule = (rule: Rule): rule is DirectionThemeRule =>
  typeof rule[3] === "function";
export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isThemeRule(rule) ? rule[3] : isDirectionRule(rule) ? rule[4] : rule[2];

const start = performance.now();
const corePlugins = getCorePlugins(cssConfig);
const coreRules: Rule[] = [];
const isRules = (v: RuleOrRules): v is Rule[] =>
  Array.isArray(v[0]) || v[0] === undefined;
for (const corePlugin in corePlugins) {
  if (cssConfig.corePlugins[corePlugin as CorePlugin] !== false) {
    const value = corePlugins[corePlugin as CorePlugin];
    coreRules.push(...(isRules(value) ? value : [value]));
  }
}
const [components, utils] = split(
  cssConfig.plugins,
  (r) => getRuleMeta(r)?.components ?? false,
);
export const rules = components.concat(coreRules, utils);
log.debug(`Loaded rules: ${(performance.now() - start).toFixed(2)}ms`);

const start2 = performance.now();
export type RuleEntry = {
  rule: Rule;
  key: string;
  direction: string;
  negative: boolean;
  order: number;
};
export const rulesEntries = new Map<string, RuleEntry>();

let order = 0;
const allowNegativeRE = /^[1-9]/;
const addTheme = (
  rule: Rule,
  prefix: string,
  themeMap: Record<string, unknown>,
  direction: string,
  meta: ThemeRuleMeta | undefined,
) => {
  const addThemeEntry = (
    fullPrefix: string,
    key: string,
    negative: boolean,
  ) => {
    if (key === "DEFAULT") {
      if (meta?.filterDefault) return;
      rulesEntries.set(fullPrefix, {
        rule,
        key,
        direction,
        negative,
        order: order++,
      });
    } else {
      rulesEntries.set(`${fullPrefix}-${key}`, {
        rule,
        key,
        direction,
        negative,
        order: order++,
      });
    }
  };

  if (meta?.supportsNegativeValues) {
    const negativePrefix = `-${prefix}`;
    for (const themeKey in themeMap) {
      if (allowNegativeRE.test(themeMap[themeKey] as string)) {
        addThemeEntry(negativePrefix, themeKey, true);
      }
    }
  }
  for (const themeKey in themeMap) {
    addThemeEntry(prefix, themeKey, false);
  }
};

for (const rule of rules) {
  if (isThemeRule(rule)) {
    addTheme(rule, rule[0], rule[1], "", rule[3]);
  } else if (isDirectionRule(rule)) {
    if (!rule[4]?.mandatory) {
      addTheme(rule, rule[0], rule[2], "all", rule[4]);
    }
    const omitHyphen = rule[4]?.omitHyphen;
    for (const direction of rule[1]) {
      const prefix = `${rule[0]}${omitHyphen ? "" : "-"}${direction}`;
      addTheme(rule, prefix, rule[2], direction, rule[4]);
    }
  } else {
    rulesEntries.set(rule[0], {
      rule,
      key: "",
      direction: "",
      negative: false,
      order: order++,
    });
  }
}

if (rulesEntries.size !== order) {
  log.warn(`Collision happened for ${order - rulesEntries.size} rule(s)`);
}

log.debug(
  `${rulesEntries.size} rules entries created in ${(
    performance.now() - start2
  ).toFixed(2)}ms`,
);
