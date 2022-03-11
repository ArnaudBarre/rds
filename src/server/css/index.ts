import { getCSSConfig } from "./cssConfig";
import { getVariants } from "./variants";
import { getTokenParser } from "./tokenParser";
import { getCSSTransform } from "./cssTransform";
import { getCSSGenerator } from "./generator";
import { getCSSPreTransform } from "./cssPreTransform";
import { getCSSBase } from "./base/cssBase";

export const initCSS = async () => {
  const cssConfig = await getCSSConfig();
  const variantsMap = getVariants(cssConfig);
  const tokenParser = getTokenParser({ cssConfig, variantsMap });
  const cssPreTransform = getCSSPreTransform({ tokenParser, variantsMap });

  return {
    getCSSBase: () => getCSSBase(cssConfig.theme),
    cssPreTransform,
    cssTransform: getCSSTransform(cssPreTransform),
    cssGenerator: getCSSGenerator({ cssConfig, variantsMap, tokenParser }),
  };
};
