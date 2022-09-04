import { readFileSync } from "fs";
import { join } from "path";
import { cssModuleToJS } from "@arnaud-barre/downwind";
import { CSSModuleExports } from "@parcel/css";

import { RDS_CLIENT } from "./consts";
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
  exports: CSSModuleExports | undefined,
) => `import { updateStyle } from "${getClientUrl()}";
updateStyle("${url}", ${JSON.stringify(code)});
${exports ? cssModuleToJS(exports) : ""}`;
