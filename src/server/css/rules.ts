import { split } from "../utils";
import { log } from "../logger";
import {
  CorePlugin,
  DirectionThemeRule,
  Rule,
  RuleMeta,
  ThemeRule,
  ThemeRuleMeta,
} from "./types";
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
export type RuleEntry = [
  ruleIndex: number,
  key: string,
  direction: string,
  negative: boolean,
  order: number,
];
export const rulesEntries = new Map<string, RuleEntry>();

let order = 0;
const allowNegativeRE = /^[1-9]/;
const addTheme = (
  prefix: string,
  themeMap: Record<string, unknown>,
  index: number,
  direction: string,
  meta: ThemeRuleMeta | undefined,
) => {
  const addThemeEntry = (
    fullPrefix: string,
    themeKey: string,
    negative: boolean,
  ) => {
    if (themeKey === "DEFAULT") {
      if (meta?.filterDefault) return;
      rulesEntries.set(fullPrefix, [
        index,
        themeKey,
        direction,
        negative,
        order++,
      ]);
    } else {
      rulesEntries.set(`${fullPrefix}-${themeKey}`, [
        index,
        themeKey,
        direction,
        negative,
        order++,
      ]);
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

for (const [index, rule] of rules.entries()) {
  if (isThemeRule(rule)) {
    addTheme(rule[0], rule[1], index, "", rule[3]);
  } else if (isDirectionRule(rule)) {
    if (!rule[4]?.mandatory) {
      addTheme(rule[0], rule[2], index, "all", rule[4]);
    }
    const omitHyphen = rule[4]?.omitHyphen;
    for (const direction of rule[1]) {
      const prefix = `${rule[0]}${omitHyphen ? "" : "-"}${direction}`;
      addTheme(prefix, rule[2], index, direction, rule[4]);
    }
  } else {
    rulesEntries.set(rule[0], [index, "", "", false, order++]);
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
