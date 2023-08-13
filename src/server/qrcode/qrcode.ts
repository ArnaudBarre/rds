import { getMatrix } from "./qr.min.js";

export const generateQRCode = (url: string, indent: string) => {
  const matrix = getMatrix(url);
  const map = { "00": "█", "01": "▀", 10: "▄", 11: " " };

  let output = indent;
  for (let x = -1; x < matrix.length + 1; x += 1) output += "▄";
  output += "\n";
  for (let y = 0; y < matrix.length; y += 2) {
    output += indent;
    for (let x = -1; x < matrix.length + 1; x += 1) {
      output += map[`${matrix[y][x] ?? 0}${matrix[y + 1]?.[x] ?? 0}`];
    }
    output += "\n";
  }
  return output;
};
