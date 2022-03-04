import {
  CorePlugin,
  CSSEntry,
  ResolvedCSSConfig,
  Rule,
  RuleMeta,
  SelectorRewrite,
} from "./types";
import { withAlphaValue, withAlphaVariable } from "./utils/colors";

export type RuleOrRules = Rule | Rule[];

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
export const getCorePlugins = ({
  theme,
  corePlugins,
}: ResolvedCSSConfig): {
  [key in CorePlugin]: RuleOrRules;
} => ({
  container: ["container", [], { addContainer: true }],
  accessibility: [
    [
      "sr-only",
      [
        ["position", "absolute"],
        ["width", "1px"],
        ["height", "1px"],
        ["padding", "0"],
        ["margin", "-1px"],
        ["overflow", "hidden"],
        ["clip", "rect(0, 0, 0, 0)"],
        ["whiteSpace", "nowrap"],
        ["borderWidth", "0"],
      ],
    ],
    [
      "not-sr-only",
      [
        ["position", "static"],
        ["width", "auto"],
        ["height", "auto"],
        ["padding", "0"],
        ["margin", "0"],
        ["overflow", "visible"],
        ["clip", "auto"],
        ["whiteSpace", "normal"],
      ],
    ],
  ],
  pointerEvents: [
    ["pointer-events-auto", [["pointer-events", "auto"]]],
    ["pointer-events-none", [["pointer-events", "none"]]],
  ],
  visibility: [
    ["visible", [["visibility", "visible"]]],
    ["invisible", [["visibility", "hidden"]]],
  ],
  position: enumRule("", "position", [
    "static",
    "fixed",
    "absolute",
    "relative",
    "sticky",
  ]),
  inset: [
    withDirectionThemeRule(
      /inset(-x|-y|-tr|-br|-bl|-tl)?/, // https://github.com/tailwindlabs/tailwindcss/discussions/7706
      theme.inset,
      (d = "-all") =>
        ({
          all: ["top", "right", "bottom", "left"],
          x: ["top", "bottom"],
          y: ["left", "right"],
          tr: ["top", "right"],
          br: ["bottom", "right"],
          bl: ["bottom", "left"],
          tl: ["top", "left"],
        }[d.slice(1)]!),
      { supportsNegativeValues: true },
    ),
    themeRule("top", theme.inset, "top", {
      supportsNegativeValues: true,
    }),
    themeRule("right", theme.inset, "right", {
      supportsNegativeValues: true,
    }),
    themeRule("bottom", theme.inset, "bottom", {
      supportsNegativeValues: true,
    }),
    themeRule("left", theme.inset, "left", {
      supportsNegativeValues: true,
    }),
  ],
  isolation: [
    ["isolate", [["isolation", "isolate"]]],
    ["isolation-auto", [["isolation", "auto"]]],
  ],
  zIndex: themeRule("z", theme.zIndex, "z-index", {
    supportsNegativeValues: true,
  }),
  order: themeRule("order", theme.order, "order", {
    supportsNegativeValues: true,
  }),
  gridColumn: themeRule("col", theme.gridColumn, "grid-column"),
  gridColumnStart: themeRule(
    "col-start",
    theme.gridColumnStart,
    "grid-column-start",
  ),
  gridColumnEnd: themeRule("col-end", theme.gridColumnEnd, "grid-column-end"),
  gridRow: themeRule("row", theme.gridRow, "grid-row"),
  gridRowStart: themeRule("row-start", theme.gridRowStart, "grid-row-start"),
  gridRowEnd: themeRule("row-end", theme.gridRowEnd, "grid-row-end"),
  float: enumRule("float-", "float", ["right", "left", "none"]),
  clear: enumRule("clear-", "clear", ["left", "right", "both", "none"]),
  boxSizing: enumRule("box-", "box-sizing", ["border-box", "content-box"]),
  display: enumRule("", "display", [
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
  aspectRatio: themeRule("aspect", theme.aspectRatio, "aspect-ratio"),
  height: themeRule("h", theme.height, "height"),
  maxHeight: themeRule("min-h", theme.minHeight, "min-height"),
  minHeight: themeRule("max-h", theme.maxHeight, "max-height"),
  width: themeRule("w", theme.width, "width"),
  minWidth: themeRule("min-w", theme.minWidth, "min-width"),
  maxWidth: themeRule("max-w", theme.maxWidth, "max-width"),
  flex: themeRule("flex", theme.flex, "flex"),
  flexShrink: themeRule("shrink", theme.flexShrink, "flex-shrink"),
  flexGrow: themeRule("grow", theme.flexGrow, "flex-grow"),
  flexBasis: themeRule("basis", theme.flexBasis, "flex-basis"),
  tableLayout: enumRule("table-", "table-layout", ["auto", "fixed"]),
  borderCollapse: enumRule("border-", "border-collapse", [
    "collapse",
    "separate",
  ]),
  transformOrigin: themeRule(
    "origin",
    theme.transformOrigin,
    "transform-origin",
  ),
  translate: withDirectionThemeRule(
    /translate-([xy])/,
    theme.translate,
    (d) => [`--tw-translate-${d!}`, ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  rotate: themeRule(
    "rotate",
    theme.rotate,
    [`--tw-rotate`, ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  skew: withDirectionThemeRule(
    /skew-([xy])/,
    theme.skew,
    (d) => [`--tw-skew-${d!}`, ["transform", cssTransformValue]],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  scale: withDirectionThemeRule(
    /scale(-[xy])?/,
    theme.scale,
    (d) => [
      ...(d ? [`--tw-scale-${d}`] : ["--tw-scale-x", "--tw-scale-y"]),
      ["transform", cssTransformValue],
    ],
    { supportsNegativeValues: true, addDefault: "transform" },
  ),
  // Non-compliant: Doesn't ship default useless transform(-cpu)
  transform: [
    [
      "transform-gpu",
      [
        [
          "transform",
          cssTransformValue.replace(
            "translate(var(--tw-translate-x), var(--tw-translate-y))",
            "translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)",
          ),
        ],
      ],
    ],
    ["transform-none", [["transform", "none"]]],
  ],
  // Non-compliant: Only handles references to first keyframes & uses stings for theme.keyframes
  animation: themeRule("animate", theme.animation, ["animation"], {
    addKeyframes: true,
  }),
  // Non-compliant: Don't use theme
  cursor: enumRule("cursor-", "cursor", [
    "auto",
    "default",
    "pointer",
    "wait",
    "text",
    "move",
    "help",
    "not-allowed",
    "none",
    "context-menu",
    "progress",
    "cell",
    "crosshair",
    "vertical-text",
    "alias",
    "copy",
    "no-drop",
    "grab",
    "grabbing",
    "all-scroll",
    "col-resize",
    "row-resize",
    "n-resize",
    "e-resize",
    "s-resize",
    "w-resize",
    "ne-resize",
    "nw-resize",
    "se-resize",
    "sw-resize",
    "ew-resize",
    "ns-resize",
    "nesw-resize",
    "nwse-resize",
    "zoom-in",
    "zoom-out",
  ]),
  touchAction: [
    ["touch-auto", [["touch-action", "auto"]]],
    ["touch-none", [["touch-action", "none"]]],
    touchActionRule("pan-x", "--tw-pan-x"),
    touchActionRule("pan-left", "--tw-pan-x"),
    touchActionRule("pan-right", "--tw-pan-x"),
    touchActionRule("pan-y", "--tw-pan-y"),
    touchActionRule("pan-up", "--tw-pan-y"),
    touchActionRule("pan-down", "--tw-pan-y"),
    touchActionRule("pinch-zoom", "--tw-pinch-zoom"),
    ["touch-manipulation", [["touch-action", "manipulation"]]],
  ],
  userSelect: enumRule("select-", "user-select", [
    "auto",
    "all",
    "text",
    "none",
  ]),
  resize: [
    ["resize-x", [["resize", "horizontal"]]],
    ["resize-y", [["resize", "vertical"]]],
    ["resize", [["resize", "both"]]],
    ["resize-none", [["resize", "none"]]],
  ],
  scrollSnapType: [
    ["snap-none", [["scroll-snap-type", "none"]]],
    [
      "snap-x",
      [["scroll-snap-type", "x var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ],
    [
      "snap-y",
      [["scroll-snap-type", "y var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ],
    [
      "snap-both",
      [["scroll-snap-type", "both var(--tw-scroll-snap-strictness)"]],
      { addDefault: "scroll-snap-type" },
    ],
    ["snap-mandatory", [["--tw-scroll-snap-strictness", "mandatory"]]],
    ["snap-proximity", [["--tw-scroll-snap-strictness", "proximity"]]],
  ],
  scrollSnapAlign: enumRule("snap-", "scroll-snap-align", [
    "start",
    "end",
    "center",
    "node",
  ]),
  scrollSnapStop: enumRule("snap-", "scroll-snap-stop", ["normal", "always"]),
  scrollMargin: withDirectionThemeRule(
    /scroll-m(xytrbl)?/,
    theme.scrollMargin,
    (d) => suffixDirection("scroll-margin", d),
    { supportsNegativeValues: true },
  ),
  scrollPadding: withDirectionThemeRule(
    /scroll-p(xytrbl)?/,
    theme.scrollPadding,
    (d) => suffixDirection("scroll-padding", d),
  ),
  listStylePosition: enumRule("list-", "list-style-position", [
    "inside",
    "outside",
  ]),
  listStyleType: themeRule("list", theme.listStyleType, "list-style-type"),
  appearance: ["appearance-none", [["appearance-none", "none"]]],
  columns: themeRule("columns", theme.columns, "columns"),
  breakBefore: enumRule("break-before-", "break-before", breaks),
  breakInside: enumRule("break-inside-", "break-inside", [
    "auto",
    "avoid",
    "avoid-page",
    "avoid-column",
  ]),
  breakAfter: enumRule("break-after-", "break-after", breaks),
  gridAutoColumns: themeRule(
    "auto-cols",
    theme.gridAutoColumns,
    "grid-auto-columns",
  ),
  gridAutoFlow: enumRule("grid-flow-", "grid-auto-flow", [
    "row",
    "column",
    "row dense",
    "column dense",
  ]),
  gridAutoRows: themeRule("auto-rows", theme.gridAutoRows, "grid-auto-rows"),
  gridTemplateColumns: themeRule(
    "grid-cols",
    theme.gridTemplateColumns,
    "grid-template-columns",
  ),
  gridTemplateRows: themeRule(
    "grid-rows",
    theme.gridTemplateRows,
    "grid-template-rows",
  ),
  // Non-compliant: Adding display flex when it will always be required
  flexDirection: [
    ["flex-row", [["flex-direction", "row"]]],
    [
      "flex-row-reverse",
      [
        ["display", "flex"],
        ["flex-direction", "row-reverse"],
      ],
    ],
    [
      "flex-col",
      [
        ["display", "flex"],
        ["flex-direction", "column"],
      ],
    ],
    [
      "flex-col-reverse",
      [
        ["display", "flex"],
        ["flex-direction", "column-reverse"],
      ],
    ],
  ],
  // Non-compliant: Adding display flex  it will always be required
  flexWrap: [
    [
      "flex-wrap",
      [
        ["display", "flex"],
        ["flex-wrap", "wrap"],
      ],
    ],
    [
      "flex-wrap-reverse",
      [
        ["display", "flex"],
        ["flex-wrap", "wrap-reverse"],
      ],
    ],
    ["flex-nowrap", [["flex-wrap", "nowrap"]]],
  ],
  placeContent: enumRule(
    "place-content-",
    "place-content",
    ["center", "start", "end", "between", "around", "evenly", "stretch"],
    prefixSpace,
  ),
  placeItems: enumRule("place-items-", "place-items", [
    "start",
    "end",
    "center",
    "stretch",
  ]),
  alignContent: enumRule(
    "content-",
    "align-content",
    ["start", "end", "center", "between", "around", "evenly"],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  alignItems: enumRule(
    "items-",
    "align-items",
    ["start", "end", "center", "baseline", "stretch"],
    prefixFlex,
  ),
  justifyContent: enumRule(
    "justify-",
    "justify-content",
    ["start", "end", "center", "between", "around", "evenly"],
    (v) => prefixSpace(prefixFlex(v)),
  ),
  justifyItems: enumRule("justify-items-", "justify-items", [
    "start",
    "end",
    "center",
    "stretch",
  ]),
  gap: [
    themeRule("gap", theme.gap, "gap"),
    themeRule("gap-x", theme.gap, "column-gap"),
    themeRule("gap-y", theme.gap, "row-gap"),
  ],
  space: [
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
  ],
  // Non-compliant order: Allow margin to override space
  margin: withDirectionThemeRule(
    /m([xytrbl])?/,
    theme.margin,
    (d) => suffixDirection("margin", d),
    { supportsNegativeValues: true },
  ),
  divideWidth: [
    themeRule("divide-x", theme.divideWidth, "border-left-width", {
      selectorRewrite: childSelectorRewrite,
    }),
    themeRule("divide-y", theme.divideWidth, "border-top-width", {
      selectorRewrite: childSelectorRewrite,
    }),
    // Non-compliant version for https://tailwindcss.com/docs/divide-width#reversing-children-order
    themeRule("divide-x-reverse", theme.divideWidth, "border-right-width", {
      selectorRewrite: childSelectorRewrite,
    }),
    themeRule("divide-y", theme.divideWidth, "border-bottom-width", {
      selectorRewrite: childSelectorRewrite,
    }),
  ],
  divideStyle: enumRule(
    "divide",
    "border-style",
    ["solid", "dashed", "dotted", "double", "none"],
    childSelectorRewrite,
  ),
  divideColor: themeRule(
    "divide",
    theme.divideColor,
    (value) =>
      withAlphaVariable({
        properties: ["border-color"],
        color: value,
        variable: "--tw-divide-opacity",
        enabled: corePlugins.divideOpacity !== false,
      }),
    { selectorRewrite: childSelectorRewrite },
  ),
  divideOpacity: themeRule(
    "divide",
    theme.divideOpacity,
    "--tw-divide-opacity",
    { selectorRewrite: childSelectorRewrite },
  ),
  placeSelf: enumRule("place-self-", "place-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
  alignSelf: enumRule(
    "self-",
    "align-self",
    ["auto", "start", "end", "center", "stretch", "baseline"],
    prefixFlex,
  ),
  justifySelf: enumRule("justify-self-", "justify-self", [
    "auto",
    "start",
    "end",
    "center",
    "stretch",
  ]),
  overflow: [
    ...enumRule("overflow-", "overflow", overflows),
    ...enumRule("overflow-x-", "overflow-x", overflows),
    ...enumRule("overflow-y-", "overflow-y", overflows),
  ],
  overscrollBehavior: [
    ...enumRule("overscroll-", "overscroll", overscrolls),
    ...enumRule("overscroll-x-", "overscroll-x", overscrolls),
    ...enumRule("overscroll-y-", "overscroll-y", overscrolls),
  ],
  scrollBehavior: enumRule("scroll-", "scroll-behavior", ["auto", "smooth"]),
  textOverflow: [
    [
      "truncate",
      [
        ["overflow", "hidden"],
        ["text-overflow", "ellipsis"],
        ["white-space", "nowrap"],
      ],
    ],
    ["text-ellipsis", [["text-overflow", "ellipsis"]]],
    ["text-clip", [["text-overflow", "clip"]]],
  ],
  whitespace: enumRule("whitespace-", "white-space", [
    "normal",
    "nowrap",
    "pre",
    "pre-line",
    "pre-wrap",
  ]),
  wordBreak: [
    [
      "break-normal",
      [
        ["overflow-wrap", "normal"],
        ["word-break", "normal"],
      ],
    ],
    ["break-words", [["overflow-wrap", "break-word"]]],
    ["break-all", [["word-break", "break-all"]]],
  ],
  borderRadius: withDirectionThemeRule(
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
      }[d.slice(1)]!),
  ),
  borderWidth: withDirectionThemeRule(
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
      }[d.slice(1)]!),
  ),
  borderStyle: enumRule("border", "border-style", [
    "solid",
    "dashed",
    "dotted",
    "double",
    "hidden",
    "none",
  ]),
  borderColor: withDirectionThemeRule(
    /^border(-(xytrbl))?-(.+)$/,
    theme.borderColor,
    (d = "all", value) =>
      withAlphaVariable({
        properties: directionMap[d].map((dir) => `border${dir}-color`),
        color: value,
        variable: "--tw-border-opacity",
        enabled: corePlugins.borderOpacity !== false,
      }),
  ),
  borderOpacity: themeRule(
    "border-opacity",
    theme.borderOpacity,
    "--tw-border-opacity",
  ),
  backgroundColor: themeRule("bg", theme.backgroundColor, (value) =>
    withAlphaVariable({
      properties: ["background-color"],
      color: value,
      variable: "--tw-bg-opacity",
      enabled: corePlugins.backgroundOpacity !== false,
    }),
  ),
  backgroundOpacity: themeRule(
    "bg-opacity",
    theme.backgroundOpacity,
    "--tw-bg-opacity",
  ),
  backgroundImage: themeRule("bg-", theme.backgroundImage, "background-image"),
  gradientColorStops: [
    themeRule("from", theme.gradientColorStops, (value) => [
      ["--tw-gradient-from", value],
      [
        "--tw-gradient-stops",
        `var(--tw-gradient-from), var(--tw-gradient-to, ${transparentTo(
          value,
        )})`,
      ],
    ]),
    themeRule("via", theme.gradientColorStops, (value) => [
      [
        "--tw-gradient-stops",
        `var(--tw-gradient-from), ${value}, var(--tw-gradient-to, ${transparentTo(
          value,
        )})`,
      ],
    ]),
    themeRule("to", theme.gradientColorStops, "--tw-gradient-to"),
  ],
  // Non-compliant: Remove deprecated decoration-(slice|clone)
  boxDecorationBreak: enumRule("box-decoration-", "box-decoration-break", [
    "slice",
    "clone",
  ]),
  backgroundSize: themeRule("bg", theme.backgroundSize, "background-size"),
  backgroundAttachment: enumRule("bg-", "background-attachment", [
    "fixed",
    "local",
    "scroll",
  ]),
  backgroundClip: enumRule("bg-clip-", "background-clip", [
    "border",
    "padding",
    "content",
    "text",
  ]),
  backgroundPosition: themeRule(
    "bg",
    theme.backgroundPosition,
    "background-position",
  ),
  backgroundRepeat: [
    ...enumRule("bg-", "background-repeat", [
      "repeat",
      "no-repeat",
      "repeat-x",
      "repeat-y",
    ]),
    ...enumRule("bg-repeat-", "background-repeat", ["round", "space"]),
  ],
  backgroundOrigin: enumRule(
    "bg-origin-",
    "background-origin",
    ["border", "padding", "content"],
    (v) => `${v}-box`,
  ),
  fill: themeRule("fill", theme.fill, "fill"),
  stroke: themeRule("stroke", theme.stroke, "stroke"),
  strokeWidth: themeRule("stroke", theme.strokeWidth, "stroke-width"),
  objectFit: enumRule("object-", "object-fit", [
    "contain",
    "cover",
    "fill",
    "none",
    "scale-down",
  ]),
  objectPosition: themeRule("object", theme.objectPosition, "object-position"),
  padding: withDirectionThemeRule(
    /p([xytrbl])?/,
    theme.padding,
    (d) => suffixDirection("padding", d),
    { supportsNegativeValues: true },
  ),
  textAlign: enumRule("text-", "text-align", [
    "left",
    "center",
    "right",
    "justify",
  ]),
  textIndent: themeRule("indent", theme.textIndent, "text-indent", {
    supportsNegativeValues: true,
  }),
  // Non-compliant: uses theme
  verticalAlign: themeRule("align", theme.verticalAlign, "vertical-align"),
  fontFamily: themeRule("font", theme.fontFamily, "font-family"),
  // Non-compliant: Doesn't handle { lineHeight, letterSpacing } format
  fontSize: [
    /^text-(.+)$/,
    ([v]) => !!theme.fontSize[v!],
    ([v]) => {
      const themed = theme.fontSize[v!];
      if (Array.isArray(themed)) {
        return [
          ["font-size", themed[0]],
          ["line-height", themed[1]],
        ];
      } else {
        return [["font-size", themed]];
      }
    },
  ],
  fontWeight: themeRule("font", theme.fontWeight, "font-weight"),
  textTransform: enumRule(
    "",
    "text-transform",
    ["uppercase", "lowercase", "capitalize", "normal-case"],
    (v) => (v === "normal-case" ? "none" : v),
  ),
  fontStyle: [
    ["italic", [["font-style", "italic"]]],
    ["not-italic", [["font-style", "normal"]]],
  ],
  fontVariantNumeric: [
    ["normal-nums", [["font-variant-numeric", "normal"]]],
    ...[
      ["--tw-ordinal", "ordinal"],
      ["--tw-slashed-zero", "slashed-zero"],
      ["--tw-numeric-figure", "lining-nums"],
      ["--tw-numeric-figure", "oldstyle-nums"],
      ["--tw-numeric-spacing", "proportional-nums"],
      ["--tw-numeric-spacing", "tabular-nums"],
      ["--tw-numeric-fraction", "diagonal-fractions"],
      ["--tw-numeric-fraction", "stacked-fractions"],
    ].map(
      ([variable, value]): Rule => [
        value,
        [
          [variable, value],
          [
            "font-variant-numeric",
            "var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)",
          ],
        ],
        { addDefault: "font-variant-numeric" },
      ],
    ),
  ],
  lineHeight: themeRule("leading", theme.lineHeight, "line-height"),
  letterSpacing: themeRule("tracking", theme.letterSpacing, "letter-spacing", {
    supportsNegativeValues: true,
  }),
  textColor: themeRule("text", theme.textColor, (value) =>
    withAlphaVariable({
      properties: ["color"],
      color: value,
      variable: "--tw-text-opacity",
      enabled: corePlugins.textOpacity !== false,
    }),
  ),
  textOpacity: themeRule(
    "text-opacity",
    theme.textOpacity,
    "--tw-text-opacity",
  ),
  textDecoration: enumRule(
    "",
    "text-decoration-line",
    ["underline", "overline", "line-through", "no-underline"],
    (v) => (v === "no-underline" ? "none" : v),
  ),
  textDecorationColor: themeRule(
    "decoration",
    theme.textDecorationColor,
    "text-decoration-color",
  ),
  textDecorationStyle: enumRule("decoration-", "text-decoration-style", [
    "solid",
    "double",
    "dotted",
    "dashed",
    "wavy",
  ]),
  textDecorationThickness: themeRule(
    "decoration",
    theme.textDecorationThickness,
    "text-decoration-thickness",
  ),
  textUnderlineOffset: themeRule(
    "underline-offset",
    theme.textUnderlineOffset,
    "text-underline-offset",
  ),
  fontSmoothing: [
    [
      "antialiased",
      [
        ["-webkit-font-smoothing", "antialiased"],
        ["-moz-osx-font-smoothing", "grayscale"],
      ],
    ],
    [
      "subpixel-antialiased",
      [
        ["-webkit-font-smoothing", "auto"],
        ["-moz-osx-font-smoothing", "auto"],
      ],
    ],
  ],
  placeholderColor: themeRule(
    "placeholder",
    theme.placeholderColor,
    (value) =>
      withAlphaVariable({
        properties: ["color"],
        color: value,
        variable: "--tw-placeholder-opacity",
        enabled: corePlugins.placeholderOpacity !== false,
      }),
    { selectorRewrite: (value) => `${value}::placeholder` },
  ),
  placeholderOpacity: themeRule(
    "placeholder-opacity",
    theme.placeholderOpacity,
    "--tw-placeholder-opacity",
    { selectorRewrite: (value) => `${value}::placeholder` },
  ),
  caretColor: themeRule("caret", theme.caretColor, "caret-color"),
  accentColor: themeRule("accent", theme.accentColor, "accent-color"),
  opacity: themeRule("opacity", theme.opacity, "opacity"),
  backgroundBlendMode: enumRule(
    "bg-blend-",
    "background-blend-mode",
    blendModes,
  ),
  mixBlendMode: enumRule("mix-blend-", "mix-blend-mode", blendModes),
  // TODO: Non-compliant: doesn't support colored box-shadow  & incompatible with ring
  boxShadow: themeRule("shadow", theme.boxShadow, "box-shadow"),
  outlineStyle: [
    [
      "outline-none",
      [
        ["outline", "2px solid transparent"],
        ["outline-offset", "2px"],
      ],
    ],
    ["outline", [["outline-style", "solid"]]],
    ...enumRule("outline-", "outline-style", [
      "dashed",
      "dotted",
      "double",
      "hidden",
    ]),
  ],
  outlineWidth: themeRule("outline", theme.outlineWidth, "outline-width"),
  outlineOffset: themeRule(
    "outline-offset",
    theme.outlineOffset,
    "outline-offset",
  ),
  outlineColor: themeRule("outline", theme.outlineColor, "outline-color"),
  ringWidth: [
    themeRule(
      "ring",
      theme.ringWidth,
      (value) => [
        [
          "--tw-ring-offset-shadow",
          `var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)`,
        ],
        [
          "--tw-ring-shadow",
          `var(--tw-ring-inset) 0 0 0 calc(${value} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
        ],
        ["box-shadow", "var(--tw-ring-offset-shadow), var(--tw-ring-shadow)"],
      ],
      { addDefault: "ring-width" },
    ),
    ["ring-inset", [["--tw-ring-inset", "inset"]]],
  ],
  ringColor: themeRule("ring", theme.ringColor, (value) =>
    withAlphaVariable({
      properties: ["--tw-ring-color"],
      color: value,
      variable: "--tw-ring-opacity",
      enabled: corePlugins.ringOpacity !== false,
    }),
  ),
  ringOpacity: themeRule(
    "ring-opacity",
    theme.ringOpacity,
    "--tw-ring-opacity",
  ),
  ringOffsetWidth: themeRule(
    "ring-offset",
    theme.ringOffsetWidth,
    "--tw-ring-offset-width",
  ),
  ringOffsetColor: themeRule(
    "ring-offset",
    theme.ringOffsetColor,
    "--tw-ring-offset-color",
  ),
  blur: filterRule("blur", theme.blur),
  brightness: filterRule("brightness", theme.brightness),
  contrast: filterRule("contrast", theme.contrast),
  dropShadow: [
    new RegExp(`^drop-shadow(-(.+))?$`),
    ([, v = "DEFAULT"]) => !!theme.dropShadow[v],
    ([, v = "DEFAULT"]) => [
      [
        "--tw-drop-shadow",
        Array.isArray(theme.dropShadow[v])
          ? (theme.dropShadow[v] as string[])
              .map((v) => `drop-shadow(${v})`)
              .join(" ")
          : `drop-shadow(${theme.dropShadow[v]})`,
      ],
      ["filter", cssFilterValue],
    ],
    { addDefault: "filter" },
  ],
  grayscale: filterRule("grayscale", theme.grayscale),
  hueRotate: filterRule("hueRotate", theme.hueRotate),
  invert: filterRule("invert", theme.invert),
  saturate: filterRule("saturate", theme.saturate),
  sepia: filterRule("sepia", theme.sepia),
  // Non-compliant: Doesn't ship default useless filter
  filter: ["filter-none", [["filter", "none"]]],
  backdropBlur: backdropFilterRule("backdrop-blur", theme.backdropBlur),
  backdropBrightness: backdropFilterRule(
    "backdrop-brightness",
    theme.backdropBrightness,
  ),
  backdropContrast: backdropFilterRule(
    "backdrop-contrast",
    theme.backdropContrast,
  ),
  backdropGrayscale: backdropFilterRule(
    "backdrop-grayscale",
    theme.backdropGrayscale,
  ),
  backdropHueRotate: backdropFilterRule(
    "backdrop-hueRotate",
    theme.backdropHueRotate,
  ),
  backdropInvert: backdropFilterRule("backdrop-invert", theme.backdropInvert),
  backdropOpacity: backdropFilterRule(
    "backdrop-opacity",
    theme.backdropOpacity,
  ),
  backdropSaturate: backdropFilterRule(
    "backdrop-saturate",
    theme.backdropSaturate,
  ),
  backdropSepia: backdropFilterRule("backdrop-sepia", theme.backdropSepia),
  // Non-compliant: Doesn't ship default useless backdrop-filter
  backdropFilter: ["backdrop-filter-none", [["backdrop-filter", "none"]]],
  transitionProperty: themeRule(
    "transition",
    theme.transitionProperty,
    (value) =>
      value === "none"
        ? [["transition-property", "none"]]
        : [
            ["transition-property", value],
            [
              "transition-timing-function",
              theme.transitionTimingFunction.DEFAULT,
            ],
            ["transition-duration", theme.transitionDuration.DEFAULT],
          ],
  ),
  transitionDelay: themeRule(
    "delay",
    theme.transitionDelay,
    "transition-delay",
  ),
  transitionDuration: themeRule(
    "duration",
    theme.transitionDuration,
    "transition-duration",
  ),
  transitionTimingFunction: themeRule(
    "ease",
    theme.transitionTimingFunction,
    "transition-timing-function",
  ),
  willChange: themeRule("will-change", theme.willChange, "will-change"),
  content: themeRule("content", theme.content, "content"),
});

type Properties = (string | CSSEntry)[];
const themeRule = (
  prefix: string,
  themeMap: Record<string, string>,
  properties: string | Properties | ((value: string) => Properties),
  options: RuleMeta & { supportsNegativeValues?: boolean } = {},
): Rule =>
  withDirectionThemeRule(
    new RegExp(`${prefix}()`), // Fake direction group
    themeMap,
    typeof properties === "function"
      ? (_, v) => properties(v)
      : () => (typeof properties === "string" ? [properties] : properties),
    options,
  );

const withDirectionThemeRule = (
  regex: RegExp, // should contains direction group
  themeMap: Record<string, string>,
  getProperties: (d: string | undefined, value: string) => Properties,
  {
    supportsNegativeValues,
    ...ruleMeta
  }: RuleMeta & { supportsNegativeValues?: boolean } = {},
): Rule => [
  new RegExp(
    `^${supportsNegativeValues ? "(-)?" : "()"}${regex.source}(-(.+))?$`,
  ),
  ([, , , v = "DEFAULT"]) => !!themeMap[v!], // TODO: validate if value is a unit when negative
  ([n = "", d, , v = "DEFAULT"]) => {
    const value = n + themeMap[v!];
    return getProperties(d, value).map((p) =>
      Array.isArray(p) ? p : [p, value],
    );
  },
  ruleMeta,
];

const enumRule = (
  prefix: string,
  property: string,
  values: string[],
  transformValue: (value: string) => string = (v) => v,
): Rule[] =>
  values.map((v) => [`${prefix}${v}`, [[property, transformValue(v)]]]);

const touchActionRule = (name: string, variable: string): Rule => [
  `touch-${name}`,
  [
    [variable, name],
    ["touch-action", cssTouchActionValue],
  ],
  { addDefault: "touch-action" },
];

const filterRule = (name: string, themeMap: Record<string, string>): Rule => [
  new RegExp(`^${name}(-(.+))?$`),
  ([, v = "DEFAULT"]) => !!themeMap[v],
  ([, v = "DEFAULT"]) => [
    [`--tw-${name}`, `${name}(${themeMap[v]})`],
    ["filter", cssFilterValue],
  ],
  { addDefault: "filter" },
];

const backdropFilterRule = (
  name: `backdrop-${string}`,
  themeMap: Record<string, string>,
): Rule => [
  new RegExp(`^${name}(-(.+))?$`),
  ([, v = "DEFAULT"]) => !!themeMap[v],
  ([, v = "DEFAULT"]) => [
    [`--tw-${name}`, `${name.slice(9)}(${themeMap[v]})`],
    ["backdrop-filter", cssBackdropFilterValue],
  ],
  { addDefault: "backdrop-filter" },
];

const childSelectorRewrite: SelectorRewrite = (v) => `${v} > * + *`;

const prefixFlex = (v: string) =>
  ["start", "end"].includes(v) ? `flex-${v}` : v;
const prefixSpace = (v: string) =>
  ["between", "around", "evenly"].includes(v) ? `space-${v}` : v;

const overflows = ["auto", "hidden", "clip", "visible", "scroll"];
const overscrolls = ["none", "contain", "auto"];
const breaks = [
  "auto",
  "avoid",
  "all",
  "avoid",
  "page",
  "left",
  "right",
  "column",
];
const blendModes = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

const suffixDirection = (
  prefix: string,
  d: string | undefined = "all",
): Properties => directionMap[d].map((suffix) => `${prefix}${suffix}`);

const directionMap: Record<string, string[]> = {
  all: [""],
  x: ["-left", "-right"],
  y: ["-top", "-bottom"],
  t: ["-top"],
  r: ["-right"],
  b: ["-bottom"],
  l: ["-left"],
};

const cssTransformValue = [
  "translate(var(--tw-translate-x), var(--tw-translate-y))",
  "rotate(var(--tw-rotate))",
  "skewX(var(--tw-skew-x))",
  "skewY(var(--tw-skew-y))",
  "scaleX(var(--tw-scale-x))",
  "scaleY(var(--tw-scale-y))",
].join(" ");
const cssTouchActionValue =
  "var(--tw-pan-x) var(--tw-pan-y) var(--tw-pinch-zoom)";
const cssFilterValue = [
  "var(--tw-blur)",
  "var(--tw-brightness)",
  "var(--tw-contrast)",
  "var(--tw-grayscale)",
  "var(--tw-hue-rotate)",
  "var(--tw-invert)",
  "var(--tw-saturate)",
  "var(--tw-sepia)",
  "var(--tw-drop-shadow)",
].join(" ");
const cssBackdropFilterValue = [
  "var(--tw-backdrop-blur)",
  "var(--tw-backdrop-brightness)",
  "var(--tw-backdrop-contrast)",
  "var(--tw-backdrop-grayscale)",
  "var(--tw-backdrop-hue-rotate)",
  "var(--tw-backdrop-invert)",
  "var(--tw-backdrop-opacity)",
  "var(--tw-backdrop-saturate)",
  "var(--tw-backdrop-sepia)",
].join(" ");

const transparentTo = (value: string) =>
  withAlphaValue(value, "0", "rgb(255 255 255 / 0)");