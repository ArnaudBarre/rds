import { CSSObject, ResolvedCSSConfig, Rule } from "../types";
import { enumRule, themeRule } from "./utils";

export const getTypography = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/font-family
  themeRule("font", theme.fontFamily, "font-family"),
  // https://tailwindcss.com/docs/font-size
  [
    /^text-(.+)$/,
    ([v]) => !!theme.fontSize[v!],
    ([v]): CSSObject => {
      const themed = theme.fontSize[v!];
      if (Array.isArray(themed)) {
        return { "font-size": themed[0], "line-height": themed[1] };
      } else {
        return { "font-size": themed };
      }
    },
  ],
  // https://tailwindcss.com/docs/font-smoothing
  [
    "antialiased",
    {
      "-webkit-font-smoothing": "antialiased",
      "-moz-osx-font-smoothing": "grayscale",
    },
  ],
  [
    "subpixel-antialiased",
    { "-webkit-font-smoothing": "auto", "-moz-osx-font-smoothing": "auto" },
  ],
  // https://tailwindcss.com/docs/font-style
  ["italic", { "font-style": "italic" }],
  ["not-italic", { "font-style": "normal" }],
  // https://tailwindcss.com/docs/font-weight
  themeRule("font", theme.fontWeight, "font-weight"),
  // https://tailwindcss.com/docs/text-color
  themeRule("text", theme.colors, "color"),
  // https://tailwindcss.com/docs/font-variant-numeric
  enumRule(
    "",
    "font-variant-numeric",
    [
      "normal-nums",
      "ordinal",
      "slashed-zero",
      "lining-nums",
      "oldstyle-nums",
      "proportional-nums",
      "tabular-nums",
      "diagonal-fractions",
      "stacked-fractions",
    ],
    (v) => (v === "normal-nums" ? "normal" : v),
  ),
  // https://tailwindcss.com/docs/letter-spacing
  themeRule("tracking", theme.letterSpacing, "letter-spacing"),
  // https://tailwindcss.com/docs/line-height
  themeRule("leading", theme.lineHeight, "line-height"),
  // https://tailwindcss.com/docs/list-style-type
  themeRule("list", theme.listStyleType, "list-style-type"),
  // https://tailwindcss.com/docs/list-style-position
  enumRule("list-", "list-style-position", ["inside", "outside"]),
  // https://tailwindcss.com/docs/text-align
  enumRule("text-", "text-align", ["left", "center", "right", "justify"]),
  // https://tailwindcss.com/docs/text-color
  // TODO: Handle opacity
  themeRule("text", theme.textColor, "color"),
  // https://tailwindcss.com/docs/text-decoration
  enumRule(
    "",
    "text-decoration-line",
    ["underline", "overline", "line-through", "no-underline"],
    (v) => (v === "no-underline" ? "none" : v),
  ),
  // https://tailwindcss.com/docs/text-decoration-color
  themeRule("decoration", theme.textDecorationColor, "text-decoration-color"),
  // https://tailwindcss.com/docs/text-decoration-style
  enumRule("decoration-", "text-decoration-style", [
    "solid",
    "double",
    "dotted",
    "dashed",
    "wavy",
  ]),
  // https://tailwindcss.com/docs/text-decoration-thickness
  themeRule(
    "decoration",
    theme.textDecorationThickness,
    "text-decoration-thickness",
  ),
  // https://tailwindcss.com/docs/text-underline-offset
  themeRule(
    "underline-offset",
    theme.textUnderlineOffset,
    "text-underline-offset",
  ),
  // https://tailwindcss.com/docs/text-transform
  enumRule(
    "",
    "text-transform",
    ["uppercase", "lowercase", "capitalize", "normal-case"],
    (v) => (v === "normal-case" ? "none" : v),
  ),
  // https://tailwindcss.com/docs/text-overflow
  [
    "truncate",
    {
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "white-space": "nowrap",
    },
  ],
  ["text-ellipsis", { "text-overflow": "ellipsis" }],
  ["text-clip", { "text-overflow": "clip" }],
  // https://tailwindcss.com/docs/text-indent
  themeRule("indent", theme.textIndent, "text-indent"),
  // https://tailwindcss.com/docs/vertical-align
  enumRule("align-", "vertical-align", [
    "baseline",
    "top",
    "middle",
    "bottom",
    "text",
    "text",
    "sub",
    "super",
  ]),
  // https://tailwindcss.com/docs/whitespace
  enumRule("whitespace-", "white-space", [
    "normal",
    "nowrap",
    "pre",
    "pre-line",
    "pre-wrap",
  ]),
  // https://tailwindcss.com/docs/word-break
  ["break-normal", { "overflow-wrap": "normal", "word-break": "normal" }],
  ["break-words", { "overflow-wrap": "break-word" }],
  ["break-all", { "word-break": "break-all" }],
  // https://tailwindcss.com/docs/content
  themeRule("content", theme.content, "content"),
];
