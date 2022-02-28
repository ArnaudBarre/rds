import { ResolvedCSSConfig, Rule } from "../types";
import { enumRule, themeRule } from "./utils";

export const getFlexboxAndGrid = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/flex-direction
  // Non-compliant: Adding display flex when it will always be required
  ["flex-row", { "flex-direction": "row" }],
  ["flex-row-reverse", { display: "flex", "flex-direction": "row-reverse" }],
  ["flex-col", { display: "flex", "flex-direction": "column" }],
  ["flex-col-reverse", { display: "flex", "flex-direction": "column-reverse" }],
  // https://tailwindcss.com/docs/flex-wrap
  // Non-compliant: Adding display flex  it will always be required
  ["flex-wrap", { display: "flex", "flex-wrap": "wrap" }],
  ["flex-wrap-reverse", { display: "flex", "flex-wrap": "wrap-reverse" }],
  ["flex-nowrap", { "flex-wrap": "nowrap" }],
  // https://tailwindcss.com/docs/flex
  themeRule("flex", theme.flex, "flex"),
  // https://tailwindcss.com/docs/flex-grow
  themeRule("grow", theme.flexGrow, "flex-grow"),
  //https://tailwindcss.com/docs/flex-shrink
  themeRule("shrink", theme.flexShrink, "flex-shrink"),
  // https://tailwindcss.com/docs/order
  // TODO
  // https://tailwindcss.com/docs/grid-template-columns
  // TODO
  // https://tailwindcss.com/docs/grid-column
  // TODO
  // https://tailwindcss.com/docs/grid-template-rows
  // TODO
  // https://tailwindcss.com/docs/grid-row
  // TODO
  // https://tailwindcss.com/docs/grid-auto-flow
  // TODO
  // https://tailwindcss.com/docs/grid-auto-columns
  // TODO
  // https://tailwindcss.com/docs/grid-auto-rows
  // TODO
  // https://tailwindcss.com/docs/gap
  themeRule("gap", theme.gap, "gap"),
  themeRule("gap-x", theme.gap, "column-gap"),
  themeRule("gap-y", theme.gap, "row-gap"),
  // https://tailwindcss.com/docs/justify-content
  enumRule(
    "justify-",
    "justify-content",
    ["start", "end", "center", "between", "around", "evenly"],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  //https://tailwindcss.com/docs/justify-items
  enumRule("justify-items-", "justify-items", [
    "start",
    "end",
    "center",
    "stretch",
  ]),
  // https://tailwindcss.com/docs/justify-self
  enumRule("justify-self-", "justify-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
  // https://tailwindcss.com/docs/align-content
  enumRule(
    "content-",
    "align-content",
    ["start", "end", "center", "between", "around", "evenly"],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  // https://tailwindcss.com/docs/align-items
  enumRule(
    "items-",
    "align-items",
    ["start", "end", "center", "baseline", "stretch"],
    prefixFlex,
  ),
  // https://tailwindcss.com/docs/align-self
  enumRule(
    "self-",
    "align-self",
    ["auto", "start", "end", "center", "stretch", "baseline"],
    prefixFlex,
  ),
  // https://tailwindcss.com/docs/place-content
  enumRule(
    "place-content-",
    "place-content",
    ["center", "start", "end", "between", "around", "evenly", "stretch"],
    prefixSpace,
  ),
  // https://tailwindcss.com/docs/place-items
  enumRule("place-items-", "place-items", [
    "start",
    "end",
    "center",
    "stretch",
  ]),
  // https://tailwindcss.com/docs/place-self
  enumRule("place-self-", "place-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
];

const prefixFlex = (v: string) =>
  ["start", "end"].includes(v) ? `flex-${v}` : v;

const prefixSpace = (v: string) =>
  ["between", "around", "evenly"].includes(v) ? `space-${v}` : v;
