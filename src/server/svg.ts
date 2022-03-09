import { Options, transform } from "@swc/core";

import { cache, readFile } from "./utils";

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

const svgToJSX = (svg: string) =>
  `import React from "react";const ReactComponent = (props) => (${svg
    .replace(/\s([a-z-:]*)="[^"]*"/gu, (string, key: string) => {
      if (key.startsWith("data-")) return string;
      const keyWithoutDashes = camelCaseOn(key, "-");
      const keyWithoutDots = camelCaseOn(keyWithoutDashes, ":");
      return string.replace(key, keyWithoutDots);
    })
    .replace(">", " {...props}>")});export default ReactComponent`;

const camelCaseOn = (string: string, delimiter: string) =>
  string
    .split(delimiter)
    .map((v, i) => (i === 0 ? v : v[0].toUpperCase() + v.slice(1)))
    .join("");
