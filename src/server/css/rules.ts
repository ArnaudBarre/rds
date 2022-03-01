import { ResolvedCSSConfig, Rule } from "./types";
import { CorePlugin, getCorePlugins, RuleOrRules } from "./corePlugins";

const isRules = (v: RuleOrRules): v is Rule[] => Array.isArray(v[0]);

export const getRules = (config: ResolvedCSSConfig): Rule[] => {
  const corePlugins = getCorePlugins(config);
  const rules: Rule[] = [];
  for (const corePlugin in corePlugins) {
    if (config.corePlugins[corePlugin as CorePlugin] !== false) {
      const value = corePlugins[corePlugin as CorePlugin];
      rules.push(...(isRules(value) ? value : [value]));
    }
  }
  return rules.concat(config.plugins); // TODO: sort
};
