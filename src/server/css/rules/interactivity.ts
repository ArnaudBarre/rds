import { ResolvedCSSConfig, Rule } from "../types";
import { enumRule, themeRule } from "./utils";

export const getInteractivity = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/appearance
  ["appearance-none", { "appearance-none": "none" }],

  // https://tailwindcss.com/docs/cursor
  themeRule("cursor", theme.cursor, "cursor"),

  // https://tailwindcss.com/docs/pointer-events
  ["pointer-events-auto", { "pointer-events": "auto" }],
  ["pointer-events-none", { "pointer-events": "none" }],

  // https://tailwindcss.com/docs/resize
  ["resize-x", { resize: "horizontal" }],
  ["resize-y", { resize: "vertical" }],
  ["resize", { resize: "both" }],
  ["resize-none", { resize: "none" }],

  // https://tailwindcss.com/docs/user-select
  enumRule("select-", "user-select", ["auto", "all", "text", "none"]),
];
