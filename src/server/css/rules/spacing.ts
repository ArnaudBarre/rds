import { ResolvedCSSConfig, Rule } from "../types";
import { childSelectorRewrite, withDirectionThemeRule } from "./utils";

export const getSpacing = ({ theme }: ResolvedCSSConfig): Rule[] => [
  withDirectionThemeRule(
    /p([xytrbl])?/,
    theme.padding,
    (d) => {
      if (d === "x") return ["padding-left", "padding-right"];
      if (d === "y") return ["padding-top", "padding-bottom"];
      return [`padding${getDirection(d)}`];
    },
    { supportsNegativeValues: true },
  ),
  withDirectionThemeRule(
    /m([xytrbl])?/,
    theme.margin,
    (d) => {
      if (d === "x") return ["margin-left", "margin-right"];
      if (d === "y") return ["margin-top", "margin-bottom"];
      return [`margin${getDirection(d)}`];
    },
    { supportsNegativeValues: true },
  ),
  // https://tailwindcss.com/docs/space
  withDirectionThemeRule(
    /space-([xy])/,
    theme.space,
    (d) => (d === "x" ? ["margin-left"] : ["margin-top"]),
    { supportsNegativeValues: true, selectorRewrite: childSelectorRewrite },
  ),
  // Non-compliant version for https://tailwindcss.com/docs/space#reversing-children-order
  withDirectionThemeRule(
    /space-([xy])-reverse/,
    theme.space,
    (d) => (d === "x" ? ["margin-right"] : ["margin-bottom"]),
    { supportsNegativeValues: true, selectorRewrite: childSelectorRewrite },
  ),
];

const getDirection = (d: string | undefined) => {
  if (!d) return "";
  return { t: "-top", r: "-right", b: "-bottom", l: "-left" }[d];
};
