import { Rule } from "./types";
import { CorePlugin, getCorePlugins, RuleOrRules } from "./corePlugins";
import { cssConfig } from "./cssConfig";

const isRules = (v: RuleOrRules): v is Rule[] =>
  Array.isArray(v[0]) || v[0] === undefined;

const corePlugins = getCorePlugins(cssConfig);
const coreRules: Rule[] = [];
for (const corePlugin in corePlugins) {
  if (cssConfig.corePlugins[corePlugin as CorePlugin] !== false) {
    const value = corePlugins[corePlugin as CorePlugin];
    coreRules.push(...(isRules(value) ? value : [value]));
  }
}
export const rules = coreRules.concat(cssConfig.plugins); // TODO: sort
