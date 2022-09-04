import { useColors } from "@arnaud-barre/config-loader";

const getFormatter = (open: string, close: string) => (input: string) =>
  useColors ? open + input + close : input;

export const colors = {
  bold: getFormatter("\x1b[1m", "\x1b[22m"),
  dim: getFormatter("\x1b[2m", "\x1b[22m"),
  red: getFormatter("\x1b[31m", "\x1b[39m"),
  green: getFormatter("\x1b[32m", "\x1b[39m"),
  yellow: getFormatter("\x1b[33m", "\x1b[39m"),
  blue: getFormatter("\x1b[34m", "\x1b[39m"),
  magenta: getFormatter("\x1b[35m", "\x1b[39m"),
  cyan: getFormatter("\x1b[36m", "\x1b[39m"),
  gray: getFormatter("\x1b[90m", "\x1b[39m"),
};
