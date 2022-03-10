import { RDS_CLIENT } from "../../consts";
import { CSSModule } from "../../types";

export const cssToHMR = (
  url: string,
  code: string,
  cssModule: CSSModule,
) => `import { updateStyle } from "/${RDS_CLIENT}";
updateStyle("${url}", ${JSON.stringify(code)});
${cssModuleToJS(cssModule)}`;

export const cssModuleToJS = (cssModule: CSSModule) =>
  cssModule
    ? Object.entries(cssModule)
        .map(([key, value]) => `export const ${key} = "${value}";\n`)
        .concat(`export default { ${Object.keys(cssModule).join(", ")} };\n`)
        .join("")
    : "";
