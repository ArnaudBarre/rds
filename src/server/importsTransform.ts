import { assetsCache } from "./assets.ts";
import { cache } from "./cache.ts";
import {
  DEPENDENCY_PREFIX,
  FS_PREFIX,
  RDS_CLIENT,
  RDS_PREFIX,
} from "./consts.ts";
import { dependenciesCache, getDependencyMetadata } from "./dependencies.ts";
import type { Downwind } from "./downwind.ts";
import { RDSError } from "./errors.ts";
import { jsonCache } from "./json.ts";
import type { Scanner } from "./scanner.ts";
import { svgCache } from "./svg.ts";
import { getHashedUrl, isInnerNode, isJSON, isSVG, run } from "./utils.ts";

export type ImportsTransform = ReturnType<typeof initImportsTransform>;

export const initImportsTransform = ({
  scanner,
  downwind,
}: {
  scanner: Scanner;
  downwind: Downwind;
}) => {
  const importsTransformCache = cache("importsTransform", (url) => {
    const scanResult = scanner.get(url);

    if (scanResult.isCSS) {
      let content = scanResult.code;
      for (const [resolvedUrl, placeholder] of scanResult.imports) {
        content = content.replace(
          placeholder,
          getHashedUrl(
            `${FS_PREFIX}/${resolvedUrl}`,
            assetsCache.get(resolvedUrl),
          ),
        );
      }
      return content;
    }

    const content = scanResult.code;
    if (!scanResult.imports.length) return content;
    let index: number | undefined = undefined;
    let output = "";
    for (let i = scanResult.imports.length - 1; i >= 0; i--) {
      const imp = scanResult.imports[i];
      if (imp.dep) {
        if (imp.n.startsWith("virtual:") || imp.n.startsWith(RDS_PREFIX)) {
          const esmURL = run(() => {
            switch (imp.n) {
              case "virtual:@downwind/utils.css":
                return getHashedUrl(imp.n, downwind.generate());
              case "virtual:@downwind/base.css":
                return getHashedUrl(imp.n, downwind.getBase());
              case "virtual:@downwind/devtools":
                return getHashedUrl(imp.n, downwind.devtoolsGenerate());
              case RDS_CLIENT:
                return `/${RDS_CLIENT}`;
              default:
                throw new Error(`Unhandled entry "${imp.n}"`);
            }
          });
          output = esmURL + content.slice(imp.e, index) + output;
          index = imp.s;
          continue;
        }
        const depMetadata = getDependencyMetadata(imp.n);
        if (!depMetadata) {
          throw new RDSError({
            message: `Unbundled dependency "${imp.n}"`,
            file: url,
          });
        }
        const hashedUrl = getHashedUrl(
          `${DEPENDENCY_PREFIX}/${imp.n}`,
          dependenciesCache.get(imp.n),
        );
        if (depMetadata.needInterop && imp.specifiers.length) {
          const defaultImportName = `__rds_${imp.n.replaceAll(/[-@/]/g, "_")}`;
          const withInterop = `import ${defaultImportName} from "${hashedUrl}";${imp.specifiers
            .map((s) => `const ${s[1]} = ${defaultImportName}["${s[0]}"]`)
            .join(";")}`;
          output = withInterop + content.slice(imp.se, index) + output;
          index = imp.ss;
        } else {
          output = hashedUrl + content.slice(imp.e, index) + output;
          index = imp.s;
        }
      } else {
        if (
          isInnerNode(imp.r) ||
          (isSVG(imp.r) &&
            !imp.n.endsWith("?url") &&
            !imp.n.endsWith("?inline")) ||
          (isJSON(imp.r) && !imp.n.endsWith("?url"))
        ) {
          output = toHashedUrl(imp.r) + content.slice(imp.e, index) + output;
          index = imp.s;
        } else {
          const name = content.slice(imp.ss, imp.se).split(" ")[1];
          const statement = imp.n.endsWith("?inline")
            ? `const ${name} = "data:image/svg+xml;base64,${assetsCache
                .get(imp.r)
                .toString("base64")}"`
            : `const ${name} = "${getHashedUrl(
                `${FS_PREFIX}/${imp.r}`,
                assetsCache.get(imp.r),
              )}${isSVG(imp.r) || isJSON(imp.r) ? "&url" : ""}"`;
          output = statement + content.slice(imp.se, index) + output;
          index = imp.ss;
        }
      }
    }
    return content.slice(0, index) + output;
  });

  const toHashedUrl = (url: string) =>
    getHashedUrl(
      `${FS_PREFIX}/${url}`,
      isInnerNode(url)
        ? importsTransformCache.get(url)
        : isSVG(url)
        ? svgCache.get(url)
        : isJSON(url)
        ? jsonCache.get(url)
        : assetsCache.get(url),
    );

  return { ...importsTransformCache, toHashedUrl };
};
