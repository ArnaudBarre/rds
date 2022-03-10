export const svgToJSX = (svg: string) =>
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
