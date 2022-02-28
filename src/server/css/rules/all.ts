import { ResolvedCSSConfig, Rule } from "../types";
import { getInteractivity } from "./interactivity";
import { getLayout } from "./layout";
import { getSpacing } from "./spacing";
import { getTypography } from "./typography";

export const getRules = (config: ResolvedCSSConfig): Rule[] =>
  [
    getInteractivity(config),
    getLayout(config),
    getSpacing(config),
    getTypography(config),
  ].flat(1);
