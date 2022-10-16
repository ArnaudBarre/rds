import { cache } from "./cache";
import { getHashedUrl, isInnerNode, isSVG } from "./utils";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { Scanner } from "./scanner";
import { dependenciesCache, getDependencyMetadata } from "./dependencies";
import { Downwind } from "./downwind";
import { RDSError } from "./errors";
import { DEPENDENCY_PREFIX, RDS_CLIENT, RDS_PREFIX } from "./consts";
import { JSImport } from "./scanImports";
import { clientUrl } from "./client";

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
          getHashedUrl(resolvedUrl, assetsCache.get(resolvedUrl)),
        );
      }
      return content;
    }

    let content = scanResult.code;
    for (let i = scanResult.imports.length - 1; i >= 0; i--) {
      const imp = scanResult.imports[i];
      if (imp.dep) {
        if (imp.n.startsWith("virtual:") || imp.n.startsWith(RDS_PREFIX)) {
          if (imp.n === "virtual:@downwind/utils.css") {
            content = replaceImportSource(
              content,
              imp,
              getHashedUrl("virtual:@downwind/utils.css", downwind.generate()),
            );
            continue;
          }
          if (imp.n === "virtual:@downwind/base.css") {
            content = replaceImportSource(
              content,
              imp,
              getHashedUrl("virtual:@downwind/base.css", downwind.getBase()),
            );
            continue;
          }
          if (imp.n === RDS_CLIENT) {
            content = replaceImportSource(content, imp, clientUrl);
            continue;
          }
          throw new Error(`Unhandled entry "${imp.n}"`);
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
          const defaultImportName = `__rds_${imp.n.replace(/[-@/]/g, "_")}`;
          content = replaceImportStatement(
            content,
            imp,
            `import ${defaultImportName} from "${hashedUrl}";${imp.specifiers
              .map((s) => `const ${s[1]} = ${defaultImportName}["${s[0]}"]`)
              .join(";")}`,
          );
        } else {
          content = replaceImportSource(content, imp, hashedUrl);
        }
      } else {
        if (
          isInnerNode(imp.r) ||
          (isSVG(imp.r) &&
            !imp.n.endsWith("?url") &&
            !imp.n.endsWith("?inline"))
        ) {
          content = replaceImportSource(content, imp, toHashedUrl(imp.r));
        } else {
          const name = content.slice(imp.ss, imp.se).split(" ")[1];
          content = replaceImportStatement(
            content,
            imp,
            imp.n.endsWith("?inline")
              ? `const ${name} = "data:image/svg+xml;base64,${assetsCache
                  .get(imp.r)
                  .toString("base64")}"`
              : `const ${name} = "${getHashedUrl(
                  imp.r,
                  assetsCache.get(imp.r),
                )}${isSVG(imp.r) ? "&url" : ""}`,
          );
        }
      }
    }
    return content;
  });

  const toHashedUrl = (url: string) =>
    getHashedUrl(
      url,
      isInnerNode(url)
        ? importsTransformCache.get(url)
        : isSVG(url)
        ? svgCache.get(url)
        : assetsCache.get(url),
    );

  return { ...importsTransformCache, toHashedUrl };
};

const replaceImportSource = (code: string, analysed: JSImport, value: string) =>
  code.slice(0, analysed.s) + value + code.slice(analysed.e);

const replaceImportStatement = (
  code: string,
  analysed: JSImport,
  value: string,
) => code.slice(0, analysed.ss) + value + code.slice(analysed.se);
