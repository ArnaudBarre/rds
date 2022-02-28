import { CSSObject, ResolvedCSSConfig, Rule } from "../types";
import { enumRule, themeRule } from "./utils";

export const getTypography = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/font-family
  themeRule(/^font-(.+)$/, theme, "fontFamily", "font-family"),
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
  themeRule(/^font-(.+)$/, theme, "fontWeight", "font-weight"),
  // https://tailwindcss.com/docs/text-color
  themeRule(/^text-(.+)$/, theme, "colors", "color"),
  //  https://tailwindcss.com/docs/text-transform
  ["case-upper", { "text-transform": "uppercase" }],
  ["case-lower", { "text-transform": "lowercase" }],
  ["case-capital", { "text-transform": "capitalize" }],
  ["case-normal", { "text-transform": "none" }],
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
  // https://tailwindcss.com/docs/whitespace
  enumRule("^whitespace-", "white-space", [
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
  ["content-none", { content: '""' }],
];
