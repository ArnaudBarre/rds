import {
  CSSObject,
  ResolvedCSSConfig,
  Rule,
  RuleMeta,
  SelectorRewrite,
} from "./types";

export type RuleOrRules = Rule | Rule[];
const defineCorePlugins = <Map extends Record<string, RuleOrRules>>(map: Map) =>
  map;
export type CorePlugin = keyof ReturnType<typeof getCorePlugins>;

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
export const getCorePlugins = ({ theme }: ResolvedCSSConfig) =>
  defineCorePlugins({
    container: [], // TODO
    accessibility: [
      [
        "sr-only",
        {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          borderWidth: "0",
        },
      ],
      [
        "not-sr-only",
        {
          position: "static",
          width: "auto",
          height: "auto",
          padding: "0",
          margin: "0",
          overflow: "visible",
          clip: "auto",
          whiteSpace: "normal",
        },
      ],
    ],
    pointerEvents: [
      ["pointer-events-auto", { "pointer-events": "auto" }],
      ["pointer-events-none", { "pointer-events": "none" }],
    ],
    visibility: [
      ["visible", { visibility: "visible" }],
      ["invisible", { visibility: "hidden" }],
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
          }[d.slice(1)] as string[]),
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
      ["isolate", { isolation: "isolate" }],
      ["isolation-auto", { isolation: "auto" }],
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
    transform: rules([
      [
        "transform",
        { transform: cssTransformValue },
        { addDefault: "transform" },
      ],
      ["transform-cpu", { transform: cssTransformValue }],
      [
        "transform-gpu",
        {
          transform: cssTransformValue.replace(
            "translate(var(--tw-translate-x), var(--tw-translate-y))",
            "translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)",
          ),
        },
      ],
      ["transform-none", { transform: "none" }],
    ]),
    // Non-compliant: Only handles references to same name keyframes
    animation: themeRule("animate", theme.animation, ["animation"], {
      addKeyframes: true,
    }),
    cursor: themeRule("cursor", theme.cursor, "cursor"),
    touchAction: [], // TODO
    userSelect: enumRule("select-", "user-select", [
      "auto",
      "all",
      "text",
      "none",
    ]),
    resize: [
      ["resize-x", { resize: "horizontal" }],
      ["resize-y", { resize: "vertical" }],
      ["resize", { resize: "both" }],
      ["resize-none", { resize: "none" }],
    ],
    scrollSnapType: [], // TODO
    scrollSnapAlign: [], // TODO
    scrollSnapStop: [], // TODO
    scrollMargin: [], // TODO
    scrollPadding: [], // TODO
    listStylePosition: enumRule("list-", "list-style-position", [
      "inside",
      "outside",
    ]),
    listStyleType: themeRule("list", theme.listStyleType, "list-style-type"),
    appearance: ["appearance-none", { "appearance-none": "none" }],
    columns: [], // TODO
    breakBefore: enumRule("break-before-", "break-before", breaks),
    breakInside: enumRule("break-inside-", "break-inside", [
      "auto",
      "avoid",
      "avoid-page",
      "avoid-column",
    ]),
    breakAfter: enumRule("break-after-", "break-after", breaks),
    gridAutoColumns: [], // TODO
    gridAutoFlow: [], // TODO
    gridAutoRows: [], // TODO
    gridTemplateColumns: [], // TODO
    gridTemplateRows: [], // TODO
    // Non-compliant: Adding display flex when it will always be required
    flexDirection: [
      ["flex-row", { "flex-direction": "row" }],
      [
        "flex-row-reverse",
        { display: "flex", "flex-direction": "row-reverse" },
      ],
      ["flex-col", { display: "flex", "flex-direction": "column" }],
      [
        "flex-col-reverse",
        { display: "flex", "flex-direction": "column-reverse" },
      ],
    ],
    // Non-compliant: Adding display flex  it will always be required
    flexWrap: [
      ["flex-wrap", { display: "flex", "flex-wrap": "wrap" }],
      ["flex-wrap-reverse", { display: "flex", "flex-wrap": "wrap-reverse" }],
      ["flex-nowrap", { "flex-wrap": "nowrap" }],
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
      (d) => {
        if (d === "x") return ["margin-left", "margin-right"];
        if (d === "y") return ["margin-top", "margin-bottom"];
        return [`margin${getDirection(d)}`];
      },
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
    // TODO: Handle opacity
    divideColor: themeRule("divide", theme.divideColor, "border-color", {
      selectorRewrite: childSelectorRewrite,
    }),
    divideOpacity: [], // TODO
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
      enumRule("overflow-", "overflow", overflows),
      enumRule("overflow-x-", "overflow-x", overflows),
      enumRule("overflow-y-", "overflow-y", overflows),
    ],
    overscrollBehavior: [
      enumRule("overscroll-", "overscroll", overscrolls),
      enumRule("overscroll-x-", "overscroll-x", overscrolls),
      enumRule("overscroll-y-", "overscroll-y", overscrolls),
    ], // TODO
    scrollBehavior: [],
    textOverflow: [
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
    ],
    whitespace: enumRule("whitespace-", "white-space", [
      "normal",
      "nowrap",
      "pre",
      "pre-line",
      "pre-wrap",
    ]),
    wordBreak: [
      ["break-normal", { "overflow-wrap": "normal", "word-break": "normal" }],
      ["break-words", { "overflow-wrap": "break-word" }],
      ["break-all", { "word-break": "break-all" }],
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
        }[d.slice(1)] as string[]),
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
        }[d.slice(1)] as string[]),
    ),
    borderStyle: enumRule("border", "border-style", [
      "solid",
      "dashed",
      "dotted",
      "double",
      "hidden",
      "none",
    ]),
    // TODO: Handle opacity
    borderColor: themeRule("border", theme.borderColor, "border-color"),
    borderOpacity: [], // TODO
    backgroundColor: [], // TODO
    backgroundOpacity: [], // TODO
    backgroundImage: [], // TODO
    gradientColorStops: [], // TODO
    boxDecorationBreak: enumRule("box-decoration-", "box-decoration-break", [
      "clone",
      "slice",
    ]),
    backgroundSize: [], // TODO
    backgroundAttachment: [], // TODO
    backgroundClip: [], // TODO
    backgroundPosition: [], // TODO
    backgroundRepeat: [], // TODO
    backgroundOrigin: [], // TODO
    fill: [], // TODO
    stroke: [], // TODO
    strokeWidth: [], // TODO
    objectFit: enumRule("object-", "object-fit", [
      "contain",
      "cover",
      "fill",
      "none",
      "scale-down",
    ]),
    objectPosition: enumRule(
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
    padding: withDirectionThemeRule(
      /p([xytrbl])?/,
      theme.padding,
      (d) => {
        if (d === "x") return ["padding-left", "padding-right"];
        if (d === "y") return ["padding-top", "padding-bottom"];
        return [`padding${getDirection(d)}`];
      },
      { supportsNegativeValues: true },
    ),
    textAlign: enumRule("text-", "text-align", [
      "left",
      "center",
      "right",
      "justify",
    ]),
    textIndent: themeRule("indent", theme.textIndent, "text-indent"),
    verticalAlign: enumRule("align-", "vertical-align", [
      "baseline",
      "top",
      "middle",
      "bottom",
      "text",
      "text",
      "sub",
      "super",
    ]),
    fontFamily: themeRule("font", theme.fontFamily, "font-family"),
    fontSize: [
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
    fontWeight: themeRule("font", theme.fontWeight, "font-weight"),
    textTransform: enumRule(
      "",
      "text-transform",
      ["uppercase", "lowercase", "capitalize", "normal-case"],
      (v) => (v === "normal-case" ? "none" : v),
    ),
    fontStyle: [
      ["italic", { "font-style": "italic" }],
      ["not-italic", { "font-style": "normal" }],
    ],
    fontVariantNumeric: enumRule(
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
    ), // TODO: fix
    lineHeight: themeRule("leading", theme.lineHeight, "line-height"),
    letterSpacing: themeRule("tracking", theme.letterSpacing, "letter-spacing"),
    textColor: themeRule("text", theme.textColor, "color"),
    textOpacity: [], // TODO
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
        {
          "-webkit-font-smoothing": "antialiased",
          "-moz-osx-font-smoothing": "grayscale",
        },
      ],
      [
        "subpixel-antialiased",
        { "-webkit-font-smoothing": "auto", "-moz-osx-font-smoothing": "auto" },
      ],
    ],
    placeholderColor: [], // TODO
    placeholderOpacity: [], // TODO
    caretColor: [], // TODO
    accentColor: [], // TODO
    opacity: [], // TODO
    backgroundBlendMode: [], // TODO
    mixBlendMode: [], // TODO
    boxShadow: [], // TODO
    boxShadowColor: [], // TODO
    outlineStyle: [], // TODO
    outlineWidth: [], // TODO
    outlineOffset: [], // TODO
    outlineColor: [], // TODO
    ringWidth: [], // TODO
    ringColor: [], // TODO
    ringOpacity: [], // TODO
    ringOffsetWidth: [], // TODO
    ringOffsetColor: [], // TODO
    blur: [], // TODO
    brightness: [], // TODO
    contrast: [], // TODO
    dropShadow: [], // TODO
    grayscale: [], // TODO
    hueRotate: [], // TODO
    invert: [], // TODO
    saturate: [], // TODO
    sepia: [], // TODO
    filter: [], // TODO
    backdropBlur: [], // TODO
    backdropBrightness: [], // TODO
    backdropContrast: [], // TODO
    backdropGrayscale: [], // TODO
    backdropHueRotate: [], // TODO
    backdropInvert: [], // TODO
    backdropOpacity: [], // TODO
    backdropSaturate: [], // TODO
    backdropSepia: [], // TODO
    backdropFilter: [], // TODO
    transitionProperty: [], // TODO
    transitionDelay: [], // TODO
    transitionDuration: [], // TODO
    transitionTimingFunction: [], // TODO
    willChange: [], // TODO
    content: themeRule("content", theme.content, "content"),
  });

// Force TS to see 3/4 rules as Rule[] instead of non conform Rule
const rules = (v: Rule[]) => v;

type Properties = (string | [string, string])[];
const themeRule = (
  prefix: string,
  themeMap: Record<string, string>,
  properties: string | Properties,
  options: RuleMeta & { supportsNegativeValues?: boolean } = {},
): Rule =>
  withDirectionThemeRule(
    new RegExp(`${prefix}()`), // Fake direction group
    themeMap,
    () => (typeof properties === "string" ? [properties] : properties),
    options,
  );

const withDirectionThemeRule = (
  regex: RegExp, // should contains direction group
  themeMap: Record<string, string>,
  getProperties: (d: string | undefined) => Properties,
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
    const entries: [string, string][] = getProperties(d).map((p) =>
      Array.isArray(p) ? p : [p, value],
    );
    return Object.fromEntries(entries);
  },
  ruleMeta,
];

const enumRule = (
  prefix: string,
  property: string,
  values: string[],
  transformValue: (value: string) => string = (v) => v,
): Rule => [
  new RegExp(`^${prefix}(${values.join("|")})$`),
  () => true,
  ([v]) => ({ [property]: transformValue(v!) }),
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

const getDirection = (d: string | undefined) => {
  if (!d) return "";
  return { t: "-top", r: "-right", b: "-bottom", l: "-left" }[d];
};

const cssTransformValue = [
  "translate(var(--tw-translate-x), var(--tw-translate-y))",
  "rotate(var(--tw-rotate))",
  "skewX(var(--tw-skew-x))",
  "skewY(var(--tw-skew-y))",
  "scaleX(var(--tw-scale-x))",
  "scaleY(var(--tw-scale-y))",
].join(" ");
