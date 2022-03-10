import { Options, transform } from "@swc/core";

import { cache, readFile } from "./utils";
import { svgToJSX } from "./svgToJSX";

export const svgCache = cache("svg", async (url) => {
  const { code } = await transform(svgToJSX(await readFile(url)), options);
  return code;
});

const options: Options = {
  jsc: {
    parser: { jsx: true, syntax: "ecmascript" },
    transform: { react: { useBuiltins: true } },
    target: "es2020",
  },
};
