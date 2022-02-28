import { ResolvedCSSConfig, Rule } from "../types";
import { withNegativeThemeRule } from "./utils";

export const getSpacing = ({ theme }: ResolvedCSSConfig): Rule[] => [
  withNegativeThemeRule(/p([xytrbl])?/, theme, "padding", (d) => {
    if (d === "x") return ["padding-left", "padding-right"];
    if (d === "y") return ["padding-top", "padding-bottom"];
    return [`padding${getDirection(d)}`];
  }),
  withNegativeThemeRule(/m([xytrbl])?/, theme, "margin", (d) => {
    if (d === "x") return ["margin-left", "margin-right"];
    if (d === "y") return ["margin-top", "margin-bottom"];
    return [`margin${getDirection(d)}`];
  }),
  // https://tailwindcss.com/docs/space
  withNegativeThemeRule(
    /space-([xy])/,
    theme,
    "space",
    (d) => (d === "x" ? ["margin-left"] : ["margin-top"]),
    (v) => `${v} > * + *`,
  ),
  // TODO: Handle space-y-reverse?
];

const getDirection = (d: string | undefined) => {
  if (!d) return "";
  return { t: "-top", r: "-right", b: "-bottom", l: "-left" }[d];
};
