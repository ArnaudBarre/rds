import { CSSModule } from "../../types";

export const cssModuleToJS = (cssModule: CSSModule) =>
  cssModule
    ? Object.entries(cssModule)
        .map(([key, value]) => `export const ${key} = "${value}";\n`)
        .concat(`export default { ${Object.keys(cssModule).join(", ")} };\n`)
        .join("")
    : "";
