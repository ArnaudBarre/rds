import { join } from "path";

import { ResolvedTheme } from "../../../types";
import { readFile } from "../../utils";
import { baseFonts } from "../theme/baseFonts";

export const getCSSBase = async (theme: ResolvedTheme) => {
  const rawCSS = await readFile(join(__dirname, "base.css"));
  return rawCSS
    .replace("__BORDER_COLOR__", theme.borderColor.DEFAULT ?? "currentColor")
    .replace("__FONT_SANS__", theme.fontFamily.sans ?? baseFonts.sans)
    .replace("__FONT_MONO__", theme.fontFamily.mono ?? baseFonts.mono)
    .replace("__PLACEHOLDER_COLOR__", theme.colors["gray-400"] ?? "#9ca3af");
};
