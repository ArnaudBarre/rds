import { split } from "../utils";
import { CorePlugin, DynamicRule, Rule, RuleMeta, StaticRule } from "./types";
import { getCorePlugins, RuleOrRules } from "./corePlugins";
import { cssConfig } from "./cssConfig";
import { log } from "../logger";

const isRules = (v: RuleOrRules): v is Rule[] =>
  Array.isArray(v[0]) || v[0] === undefined;
export const isStaticRule = (rule: Rule): rule is StaticRule =>
  typeof rule[0] === "string";
export const getRuleMeta = (rule: Rule): RuleMeta | undefined =>
  isStaticRule(rule) ? rule[2] : rule[3];

const start = performance.now();
const corePlugins = getCorePlugins(cssConfig);
const coreRules: Rule[] = [];
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

export const map = new Map<string, number>();
export const dynamicRules: [DynamicRule, number][] = [];
for (const [index, rule] of rules.entries()) {
  if (isStaticRule(rule)) {
    map.set(rule[0], index);
  } else {
    dynamicRules.push([rule, index]);
  }
}

log.debug(`Map created: ${(performance.now() - start).toFixed(2)}ms`);
