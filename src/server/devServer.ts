import { join } from "path";

import { Extension } from "./mimeTypes";
import {
  getExtension,
  isCSS,
  isJS,
  isSVG,
  readCacheFile,
  readFileSync,
} from "./utils";
import {
  DEPENDENCY_PREFIX,
  ENTRY_POINT,
  RDS_CLIENT,
  RDS_CSS_UTILS,
  RDS_PREFIX,
  RDS_VIRTUAL_PREFIX,
} from "./consts";
import { cssToHMR } from "./css/utils/hmr";
import { publicFiles, publicFilesCache } from "./public";
import { getDependency, transformDependenciesImports } from "./dependencies";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { CSSGenerator } from "./css/generator";
import { ImportsTransform } from "./importsTransform";
import { createServer } from "./createServer";

export const createDevServer = ({
  importsTransform,
  cssGenerator,
}: {
  importsTransform: ImportsTransform;
  cssGenerator: CSSGenerator;
}) =>
  createServer(async (url) => {
    if (url.startsWith(RDS_PREFIX)) {
      if (url === RDS_CLIENT) {
        return {
          content: readFileSync(join(__dirname, "../client/index.js")),
          type: "js",
          browserCache: false, // TODO: use caching based on rds version
        };
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }
    if (url.startsWith(RDS_VIRTUAL_PREFIX)) {
      if (url === RDS_CSS_UTILS) {
        return {
          content: cssToHMR(url, cssGenerator.generate(), false),
          type: "js",
          browserCache: true,
        };
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }

    if (publicFiles.has(url)) {
      const content = await publicFilesCache.get(url);
      return {
        type: getExtension(url) as Extension,
        content,
        browserCache: false,
      };
    }

    if (url.startsWith(DEPENDENCY_PREFIX)) {
      const path = url.slice(DEPENDENCY_PREFIX.length + 1);
      if (url.endsWith(".map")) {
        const content = await readCacheFile(path);
        return { type: "json", content, browserCache: false }; // TODO: enable browser cache
      }
      const code = await getDependency(path);
      return { type: "js", content: code, browserCache: true };
    }
    if (isJS(url)) {
      const { code, depsImports } = await importsTransform.get(url);
      const content = await transformDependenciesImports({
        code,
        depsImports,
        cssGenerator,
      });
      return { type: "js", content, browserCache: true };
    }
    if (isCSS(url)) {
      const { code } = await importsTransform.get(url);
      return { type: "js", content: code, browserCache: true };
    }
    if (isSVG(url)) {
      const code = await svgCache.get(url);
      const content = await transformDependenciesImports({
        code,
        depsImports: [{ source: "react", specifiers: [] }],
        cssGenerator,
      });
      return { type: "js", content, browserCache: true };
    }
    if (url.includes(".")) {
      if (!assetsCache.has(url)) return null;
      return {
        type: getExtension(url) as Extension,
        content: await assetsCache.get(url),
        browserCache: true,
      };
    }

    const content = await publicFilesCache.get("index.html");
    const entryUrl = await importsTransform.toHashedUrl(ENTRY_POINT);
    return {
      type: "html",
      content: content
        .toString()
        .replace(
          "<head>",
          `<head>\n    <script type="module" src="/${RDS_CLIENT}"></script>`,
        )
        .replace(
          "</body>",
          `  <script type="module" src="${entryUrl}"></script>\n  </body>`,
        ),
      browserCache: false,
    };
  });
