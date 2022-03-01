/**
 * Credit: Tailwind CSS
 * https://github.com/tailwindlabs/tailwindcss/blob/master/src/util/color.js
 * https://github.com/tailwindlabs/tailwindcss/blob/master/src/util/withAlphaVariable.js
 */

const HEX = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i;
const SHORT_HEX = /^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;
const VALUE = `(?:\\d+|\\d*\\.\\d+)%?`;
const SEP = `(?:\\s*,\\s*|\\s+)`;
const ALPHA_SEP = `\\s*[,/]\\s*`;
const RGB = new RegExp(
  `^rgba?\\(\\s*(${VALUE})${SEP}(${VALUE})${SEP}(${VALUE})(?:${ALPHA_SEP}(${VALUE}))?\\s*\\)$`,
);
const HSL = new RegExp(
  `^hsla?\\(\\s*((?:${VALUE})(?:deg|rad|grad|turn)?)${SEP}(${VALUE})${SEP}(${VALUE})(?:${ALPHA_SEP}(${VALUE}))?\\s*\\)$`,
);

type ParsedColor = {
  mode: "rgb" | "hsl";
  color: [string, string, string];
  alpha: string | undefined;
};
export const parseColor = (value: string): ParsedColor | null => {
  value = value.trim();
  if (value === "transparent") {
    return { mode: "rgb", color: ["0", "0", "0"], alpha: "0" };
  }

  const hex = value
    .replace(SHORT_HEX, (_, r, g, b, a) =>
      ["#", r, r, g, g, b, b, a ? a + a : ""].join(""),
    )
    .match(HEX);

  if (hex !== null) {
    return {
      mode: "rgb",
      color: [
        parseInt(hex[1], 16).toString(),
        parseInt(hex[2], 16).toString(),
        parseInt(hex[3], 16).toString(),
      ],
      alpha: hex[4] ? (parseInt(hex[4], 16) / 255).toString() : undefined,
    };
  }

  const rgbMatch = value.match(RGB);
  if (rgbMatch !== null) {
    return {
      mode: "rgb",
      color: [rgbMatch[1], rgbMatch[2], rgbMatch[3]],
      alpha: rgbMatch[4]?.toString(),
    };
  }

  const hslMatch = value.match(HSL);
  if (hslMatch !== null) {
    return {
      mode: "hsl",
      color: [hslMatch[1], hslMatch[2], hslMatch[3]],
      alpha: hslMatch[4]?.toString(),
    };
  }

  return null;
};

export const formatColor = ({ mode, color, alpha }: ParsedColor) =>
  `${mode}(${color.join(" ")}${alpha === undefined ? "" : ` / ${alpha}`})`;

export const withAlphaValue = (
  color: string,
  alpha: string,
  defaultValue: string,
) => {
  const parsed = parseColor(color);
  return parsed ? formatColor({ ...parsed, alpha }) : defaultValue;
};
