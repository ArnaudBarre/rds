import { ResolvedCSSConfig, Rule } from "../types";
import { themeRule } from "./utils";

export const getSizing = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/width
  themeRule("w", theme.width, "width"),
  // https://tailwindcss.com/docs/min-width
  themeRule("min-w", theme.minWidth, "min-width"),
  // https://tailwindcss.com/docs/max-width
  themeRule("max-w", theme.maxWidth, "max-width"),
  // https://tailwindcss.com/docs/height
  themeRule("h", theme.height, "height"),
  // https://tailwindcss.com/docs/min-height
  themeRule("min-h", theme.minHeight, "min-height"),
  // https://tailwindcss.com/docs/max-height
  themeRule("max-h", theme.maxHeight, "max-height"),
];
