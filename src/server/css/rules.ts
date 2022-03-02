import { Rule } from "./types";
import { CorePlugin, getCorePlugins, RuleOrRules } from "./corePlugins";
import { cssConfig } from "./cssConfig";
import { split } from "../utils";
import { getRuleMeta } from "./matcher";

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
const [components, utils] = split(
  cssConfig.plugins,
  (r) => getRuleMeta(r)?.components ?? false,
);
export const rules = components.concat(coreRules, utils);
