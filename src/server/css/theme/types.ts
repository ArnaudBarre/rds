export type ResolvedTheme = Record<SimpleThemeKey, Record<string, string>> & {
  fontSize: Record<string, string | [string, string]>;
};

export type BaseTheme = {
  [key in Exclude<ThemeKey, "colors" | "fontSize">]:
    | Record<string, string>
    | ((options: ThemeValueCallbackOptions) => Record<string, string>);
} & {
  colors: Record<string, string | Record<string, string>>;
  fontSize: Record<string, string | [string, string]>;
};

export type ThemeExtend = Partial<BaseTheme>;

export type ThemeValueCallbackOptions = {
  theme: (key: ThemeKey) => Record<string, string>;
};

export type SimpleThemeKey = Exclude<ThemeKey, "fontSize">;
export type ThemeKey =
  | "colors"
  | "spacing"
  | "borderColor"
  | "borderOpacity"
  | "borderRadius"
  | "borderWidth"
  | "boxShadow"
  | "content"
  | "cursor"
  | "divideColor"
  | "divideOpacity"
  | "divideWidth"
  | "flex"
  | "flexGrow"
  | "flexShrink"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "gap"
  | "height"
  | "inset"
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
  | "padding"
  | "space"
  | "textColor"
  | "textDecorationColor"
  | "textDecorationThickness"
  | "textUnderlineOffset"
  | "textIndent"
  | "textOpacity"
  | "translate"
  | "width"
  | "zIndex";
