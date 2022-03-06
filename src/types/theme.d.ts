export type ResolvedTheme = Record<
  Exclude<ThemeKey, "screens" | "container" | "fontSize" | "dropShadow">,
  Record<string, string>
> & {
  screens: Record<string, Screen>;
  container: Container;
  fontSize: Record<string, string | [string, string]>;
  dropShadow: Record<string, string | [string, string]>;
};

export type BaseTheme = {
  [key in Exclude<
    ThemeKey,
    "screens" | "container" | "colors" | "fontSize" | "dropShadow"
  >]:
    | Record<string, string>
    | ((theme: ThemeCallback) => Record<string, string>);
} & {
  screens: Record<string, string | Screen>;
  container: Container;
  colors: Record<string, string | Record<string, string>>;
  fontSize: Record<string, string | [string, string]>;
  dropShadow: Record<string, string | [string, string]>;
};

export type ThemeCallback = {
  (key: Exclude<ThemeKey, "container" | "dropShadow">): Record<string, string>;
  (key: "screens"): Record<string, Screen>;
};

type Screen = { min: string; max?: string } | { min?: string; max: string };
type Container = {
  center?: boolean;
  padding?: string | Record<string, string>;
};

export type ThemeKey =
  | "screens"
  | "colors"
  | "columns"
  | "spacing"
  | "animation"
  | "aspectRatio"
  | "backdropBlur"
  | "backdropBrightness"
  | "backdropContrast"
  | "backdropGrayscale"
  | "backdropHueRotate"
  | "backdropInvert"
  | "backdropOpacity"
  | "backdropSaturate"
  | "backdropSepia"
  | "backgroundColor"
  | "backgroundImage"
  | "backgroundOpacity"
  | "backgroundPosition"
  | "backgroundSize"
  | "blur"
  | "brightness"
  | "borderColor"
  | "borderOpacity"
  | "borderRadius"
  | "borderWidth"
  | "boxShadow"
  | "boxShadowColor"
  | "caretColor"
  | "accentColor"
  | "contrast"
  | "container"
  | "content"
  | "divideColor"
  | "divideOpacity"
  | "divideWidth"
  | "dropShadow"
  | "fill"
  | "grayscale"
  | "hueRotate"
  | "invert"
  | "flex"
  | "flexBasis"
  | "flexGrow"
  | "flexShrink"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "gap"
  | "gradientColorStops"
  | "gridAutoColumns"
  | "gridAutoRows"
  | "gridColumn"
  | "gridColumnEnd"
  | "gridColumnStart"
  | "gridRow"
  | "gridRowStart"
  | "gridRowEnd"
  | "gridTemplateColumns"
  | "gridTemplateRows"
  | "height"
  | "inset"
  | "keyframes"
  | "letterSpacing"
  | "lineClamp"
  | "lineHeight"
  | "listStyleType"
  | "margin"
  | "maxHeight"
  | "maxWidth"
  | "minHeight"
  | "minWidth"
  | "objectPosition"
  | "opacity"
  | "order"
  | "padding"
  | "placeholderColor"
  | "placeholderOpacity"
  | "outlineColor"
  | "outlineOffset"
  | "outlineWidth"
  | "ringColor"
  | "ringOffsetColor"
  | "ringOffsetWidth"
  | "ringOpacity"
  | "ringWidth"
  | "rotate"
  | "saturate"
  | "scale"
  | "scrollMargin"
  | "scrollPadding"
  | "sepia"
  | "skew"
  | "space"
  | "stroke"
  | "strokeWidth"
  | "textColor"
  | "textDecorationColor"
  | "textDecorationThickness"
  | "textUnderlineOffset"
  | "textIndent"
  | "textOpacity"
  | "transformOrigin"
  | "transitionDelay"
  | "transitionDuration"
  | "transitionProperty"
  | "transitionTimingFunction"
  | "translate"
  | "verticalAlign"
  | "width"
  | "willChange"
  | "zIndex";
