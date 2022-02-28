import { ResolvedCSSConfig, Rule } from "../types";
import {
  childSelectorRewrite,
  enumRule,
  themeRule,
  withDirectionThemeRule,
} from "./utils";

export const getBorders = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/border-radius
  withDirectionThemeRule(
    /rounded(-t|-r|-l|-b|-tr|-br|-bl|-tl)?/,
    theme.borderRadius,
    (d = "-all") =>
      ({
        all: ["border-radius"],
        t: ["border-top-left-radius", "border-top-right-radius"],
        r: ["border-top-right-radius", "border-bottom-right-radius"],
        b: ["border-bottom-right-radius", "border-bottom-left-radius"],
        l: ["border-top-left-radius", "border-bottom-left-radius"],
        tr: ["border-top-right-radius"],
        br: ["border-bottom-right-radius"],
        bl: ["border-bottom-left-radius"],
        tl: ["border-top-left-radius"],
      }[d.slice(1)] as string[]),
  ),
  //https://tailwindcss.com/docs/border-width
  withDirectionThemeRule(
    /border(-x|-y|-tr|-br|-bl|-tl)?/,
    theme.borderWidth,
    (d = "-all") =>
      ({
        all: ["border-width"],
        x: ["border-left-width", "border-right-width"],
        y: ["border-top-width", "border-bottom-width"],
        t: ["border-top-width"],
        r: ["border-right-width"],
        b: ["border-bottom-width"],
        l: ["border-left-width"],
      }[d.slice(1)] as string[]),
  ),
  //https://tailwindcss.com/docs/border-color
  // TODO: Handle opacity
  themeRule("border", theme.borderColor, "border-color"),
  // https://tailwindcss.com/docs/border-style
  enumRule("border", "border-style", [
    "solid",
    "dashed",
    "dotted",
    "double",
    "hidden",
    "none",
  ]),
  // https://tailwindcss.com/docs/divide-width
  themeRule(
    "divide-x",
    theme.divideWidth,
    "border-left-width",
    childSelectorRewrite,
  ),
  themeRule(
    "divide-y",
    theme.divideWidth,
    "border-top-width",
    childSelectorRewrite,
  ),
  // Non-compliant version for https://tailwindcss.com/docs/divide-width#reversing-children-order
  themeRule(
    "divide-x-reverse",
    theme.divideWidth,
    "border-right-width",
    childSelectorRewrite,
  ),
  themeRule(
    "divide-y",
    theme.divideWidth,
    "border-bottom-width",
    childSelectorRewrite,
  ),
  // https://tailwindcss.com/docs/divide-color
  // TODO: Handle opacity
  themeRule("divide", theme.divideColor, "border-color", childSelectorRewrite),
  // https://tailwindcss.com/docs/divide-style
  enumRule(
    "divide",
    "border-style",
    ["solid", "dashed", "dotted", "double", "none"],
    childSelectorRewrite,
  ),
];
