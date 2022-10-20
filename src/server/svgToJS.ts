const attributesRE = /\s([a-zA-Z0-9-:]+)=("[^"]*")/gu;

export const svgToJS = (
  svg: string,
  jsxImport: string,
  jsxFn: string,
  forwardRefImport: string,
  forwardRefFn: string,
) => {
  const index = svg.indexOf(">");
  const content = svg
    .slice(index + 1, svg.indexOf("</svg>"))
    .trim()
    .replace(/\s+/g, " ");
  let attributes = "";
  for (const match of svg.slice(0, index).matchAll(attributesRE)) {
    attributes += `    ${transformKey(match[1])}: ${match[2]},\n`;
  }
  return `${jsxImport}
${forwardRefImport}  
export default ${forwardRefFn}((props, ref) => ${jsxFn}("svg", {
${attributes}    ref,
    ...props,
    dangerouslySetInnerHTML: { __html: '${content}' }
  })
);`;
};

const transformKey = (key: string) => {
  if (key.startsWith("data-")) return `"${key}"`;
  const keyWithoutDashes = camelCaseOn(key, "-");
  return camelCaseOn(keyWithoutDashes, ":");
};

const camelCaseOn = (string: string, delimiter: string) =>
  string
    .split(delimiter)
    .map((v, i) => (i === 0 ? v : v[0].toUpperCase() + v.slice(1)))
    .join("");
