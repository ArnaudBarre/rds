import { ResolvedCSSConfig, Rule } from "../types";
import { getLayout } from "./layout";
import { getFlexboxAndGrid } from "./flexboxAndGrid";
import { getSpacing } from "./spacing";
import { getSizing } from "./sizing";
import { getTypography } from "./typography";
import { getInteractivity } from "./interactivity";
import { getBorders } from "./borders";

export const getRules = (config: ResolvedCSSConfig): Rule[] =>
  [
    getLayout(config),
    getFlexboxAndGrid(config),
    getSpacing(config),
    getSizing(config),
    getTypography(config),
    // background
    getBorders(config),
    getInteractivity(config),
  ].flat(1);
