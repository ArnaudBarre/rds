import { getCSSConfig } from "./cssConfig";
import { getVariants } from "./variants";
import { getTokenParser } from "./tokenParser";
import { getCSSTransform } from "./cssTransform";
import { getCSSGenerator } from "./generator";
import { getCSSPreTransform } from "./cssPreTransform";

export const initCSS = async () => {
  const cssConfig = await getCSSConfig();
  const variantsMap = getVariants(cssConfig);
  const tokenParser = getTokenParser({ cssConfig, variantsMap });
  const cssPreTransform = getCSSPreTransform({ tokenParser, variantsMap });

  return {
    cssPreTransform,
    cssTransform: getCSSTransform(cssPreTransform),
    cssGenerator: getCSSGenerator({ cssConfig, variantsMap, tokenParser }),
  };
};
