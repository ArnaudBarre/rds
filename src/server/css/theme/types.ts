import { Keyframes } from "../types";

export type ResolvedTheme = Record<
  Exclude<ThemeKey, "fontSize" | "dropShadow" | "keyframes">,
  Record<string, string>
> & {
  fontSize: Record<string, string | [string, string]>;
  dropShadow: Record<string, string | [string, string]>;
  keyframes: Record<string, Keyframes>;
};

export type BaseTheme = {
  [key in Exclude<
    ThemeKey,
    "colors" | "fontSize" | "dropShadow" | "keyframes"
  >]:
    | Record<string, string>
    | ((options: ThemeValueCallbackOptions) => Record<string, string>);
} & {
  colors: Record<string, string | Record<string, string>>;
  fontSize: Record<string, string | [string, string]>;
  dropShadow: Record<string, string | [string, string]>;
  keyframes: Record<string, Keyframes>;
};

export type ThemeValueCallbackOptions = {
  theme: (
    key: Exclude<ThemeKey, "dropShadow" | "keyframes">,
  ) => Record<string, string>;
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
  | "width"
  | "willChange"
  | "zIndex";
