import { getCSSConfig } from "./cssConfig";
import { getVariants } from "./variants";
import { getTokenParser } from "./tokenParser";
import { getCSSTransform } from "./cssTransform";
import { getCSSGenerator } from "./generator";

export const initCSS = async () => {
  const cssConfig = await getCSSConfig();
  const variantsMap = getVariants(cssConfig);
  const tokenParser = getTokenParser({ cssConfig, variantsMap });

  return {
    cssTransform: getCSSTransform(tokenParser),
    cssGenerator: getCSSGenerator({ cssConfig, variantsMap, tokenParser }),
  };
};
