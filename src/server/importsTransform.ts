import {
  cache,
  getHashedUrl,
  impSourceToRegex,
  isCSS,
  isInnerNode,
  isSVG,
} from "./utils";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { CSSGenerator } from "./css/generator";
import { Scanner } from "./scan";
import { transformDependenciesImports } from "./dependencies";

export type ImportsTransform = ReturnType<typeof initImportsTransform>;

export const initImportsTransform = ({
  scanner,
  getCSSBase,
  cssGenerator,
}: {
  scanner: Scanner;
  getCSSBase: () => Promise<string>;
  cssGenerator: CSSGenerator;
}) => {
  const importsTransformCache = cache("transformImports", async (url) => {
    const isCSSFile = isCSS(url);

    const { code, depsImports, imports } = await scanner.get(url);
    let content = code;

    for (const [resolvedUrl, placeholder] of imports) {
      if (isCSSFile) {
        content = content.replace(placeholder, await toHashedUrl(resolvedUrl));
      } else {
        if (
          isInnerNode(resolvedUrl) ||
          (isSVG(resolvedUrl) &&
            !placeholder.endsWith("?url") &&
            !placeholder.endsWith("?inline"))
        ) {
          content = content.replace(
            new RegExp(`(import|from)${impSourceToRegex(placeholder)}`),
            `$1 "${await toHashedUrl(resolvedUrl)}"`,
          );
        } else {
          content = content.replace(
            new RegExp(
              `import\\s+(\\S+)\\s+from${impSourceToRegex(placeholder)}`,
            ),
            placeholder.endsWith("?inline")
              ? `const $1 = "data:image/svg+xml;base64,${(
                  await assetsCache.get(resolvedUrl)
                ).toString("base64")}"`
              : isSVG(resolvedUrl)
              ? `const $1 = "${getHashedUrl(
                  resolvedUrl,
                  await assetsCache.get(resolvedUrl),
                )}&url"`
              : `const $1 = "${await toHashedUrl(resolvedUrl)}"`,
          );
        }
      }
    }

    return transformDependenciesImports({
      code: content,
      url,
      depsImports,
      getCSSBase,
      cssGenerator,
    });
  });

  const toHashedUrl = async (url: string) =>
    getHashedUrl(
      url,
      isInnerNode(url)
        ? await importsTransformCache.get(url)
        : isSVG(url)
        ? await svgCache.get(url)
        : await assetsCache.get(url),
    );

  return { ...importsTransformCache, toHashedUrl };
};
