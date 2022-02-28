import { ResolvedCSSConfig, Rule } from "../types";
import { enumRule, withNegativeThemeRule } from "./utils";

export const getLayout = ({ theme }: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/display
  enumRule("", "display", [
    "block",
    "inline-block",
    "inline",
    "flex",
    "inline-flex",
    "table",
    "inline-table",
    "table-caption",
    "table-cell",
    "table-column",
    "table-column-group",
    "table-footer-group",
    "table-header-group",
    "table-row-group",
    "table-row",
    "flow-root",
    "grid",
    "inline-grid",
    "contents",
    "list-item",
    "hidden",
  ]),
  // https://tailwindcss.com/docs/float
  enumRule("float-", "float", ["right", "left", "none"]),
  // https://tailwindcss.com/docs/clear
  enumRule("clear-", "clear", ["left", "right", "both", "none"]),
  // https://tailwindcss.com/docs/isolation
  ["isolate", { isolation: "isolate" }],
  ["isolation-auto", { isolation: "auto" }],
  // https://tailwindcss.com/docs/object-fit
  enumRule("object-", "object-fit", [
    "contain",
    "cover",
    "fill",
    "none",
    "scale-down",
  ]),
  // https://tailwindcss.com/docs/object-position
  enumRule(
    "object-",
    "object-position",
    [
      "left-top",
      "top",
      "right-top",
      "left",
      "center",
      "right",
      "left-bottom",
      "bottom",
      "right-bottom",
    ],
    (v) => v.replace("-", " "),
  ),
  // https://tailwindcss.com/docs/overflow
  enumRule("overflow-", "overflow", overflows),
  enumRule("overflow-x-", "overflow-x", overflows),
  enumRule("overflow-y-", "overflow-y", overflows),
  // https://tailwindcss.com/docs/overscroll-behavior
  enumRule("overscroll-", "overscroll", overscrolls),
  enumRule("overscroll-x-", "overscroll-x", overscrolls),
  enumRule("overscroll-y-", "overscroll-y", overscrolls),
  // https://tailwindcss.com/docs/position
  enumRule("", "position", [
    "static",
    "fixed",
    "absolute",
    "relative",
    "sticky",
  ]),
  // https://tailwindcss.com/docs/top-right-bottom-left
  withNegativeThemeRule(
    /inset(-x|-y|-tr|-br|-bl|-tl)?/, // https://github.com/tailwindlabs/tailwindcss/discussions/7706
    theme,
    "inset",
    (d = "-all") =>
      ({
        all: ["top", "right", "bottom", "left"],
        x: ["top", "bottom"],
        y: ["left", "right"],
        tr: ["top", "right"],
        br: ["bottom", "right"],
        bl: ["bottom", "left"],
        tl: ["top", "left"],
      }[d.slice(1)] as string[]),
  ),
  withNegativeThemeRule(/top()/, theme, "inset", () => ["top"]),
  withNegativeThemeRule(/right()/, theme, "inset", () => ["right"]),
  withNegativeThemeRule(/bottom()/, theme, "inset", () => ["bottom"]),
  withNegativeThemeRule(/left()/, theme, "inset", () => ["left"]),
  // https://tailwindcss.com/docs/visibility
  ["visible", { visibility: "visible" }],
  ["invisible", { visibility: "hidden" }],
  withNegativeThemeRule(/z()/, theme, "zIndex", () => ["z-index"]),
];

const overflows = ["auto", "hidden", "clip", "visible", "scroll"];
const overscrolls = ["none", "contain", "auto"];
