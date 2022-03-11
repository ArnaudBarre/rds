import { readFileSync } from "fs";
import { join } from "path";

import { CSSModule } from "./types";
import { RDS_CLIENT } from "./consts";
import { cssModuleToJS } from "./css/utils/cssModuleToJS";
import { getHashedUrl } from "./utils";

let clientCode: Buffer | undefined;
export const getClientCode = () =>
  clientCode ??
  (clientCode = readFileSync(join(__dirname, "../client/index.js")));

let clientUrl: string | undefined;
export const getClientUrl = () =>
  clientUrl ?? (clientUrl = getHashedUrl(RDS_CLIENT, getClientCode()));

export const cssToHMR = (
  url: string,
  code: string,
  cssModule: CSSModule,
) => `import { updateStyle } from "${getClientUrl()}";
updateStyle("${url}", ${JSON.stringify(code)});
${cssModuleToJS(cssModule)}`;
