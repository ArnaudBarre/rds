import { Extension } from "./mimeTypes";
import { getExtension, isCSS, isJS, isSVG, readCacheFile } from "./utils";
import {
  DEPENDENCY_PREFIX,
  ENTRY_POINT,
  RDS_CLIENT,
  RDS_OPEN_IN_EDITOR,
  RDS_PREFIX,
} from "./consts";
import { publicFiles, publicFilesCache } from "./public";
import { dependenciesCache } from "./dependencies";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { ImportsTransform } from "./importsTransform";
import { createServer } from "./createServer";
import { clientCode, clientUrl } from "./client";
import { ResolvedConfig } from "./loadConfig";
import { openInEditor } from "./openInEditor";
import { Downwind } from "./downwind";
import { LoadedFile } from "./types";

export const createDevServer = ({
  config,
  importsTransform,
  downwind,
}: {
  config: ResolvedConfig;
  importsTransform: ImportsTransform;
  downwind: Downwind;
}) =>
  createServer(config, (url, searchParams) => {
    if (url.startsWith(RDS_PREFIX)) {
      if (url === RDS_CLIENT) return cachedJS(clientCode);
      if (url === RDS_OPEN_IN_EDITOR) {
        openInEditor(searchParams.get("file")!);
        return;
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }
    if (url.startsWith("virtual:")) {
      if (url === "virtual:@downwind/base.css") {
        return cachedJS(downwind.getBase());
      }
      if (url === "virtual:@downwind/utils.css") {
        return cachedJS(downwind.generate());
      }
      throw new Error(`Unexpect entry point: ${url}`);
    }

    if (publicFiles.has(url)) {
      const content = publicFilesCache.get(url);
      return {
        type: getExtension(url) as Extension,
        content,
        browserCache: false,
      };
    }

    if (url.startsWith(DEPENDENCY_PREFIX)) {
      const path = url.slice(DEPENDENCY_PREFIX.length + 1);
      if (url.endsWith(".map")) {
        const content = readCacheFile(path);
        return { type: "json", content, browserCache: false };
      }
      return cachedJS(dependenciesCache.get(path));
    }
    if (isJS(url) || isCSS(url)) return cachedJS(importsTransform.get(url));
    if (isSVG(url) && !searchParams.has("url")) {
      return cachedJS(svgCache.get(url));
    }
    if (url.includes(".")) {
      if (!assetsCache.has(url)) return "NOT_FOUND";
      return {
        type: getExtension(url) as Extension,
        content: assetsCache.get(url),
        browserCache: true,
      };
    }

    const content = publicFilesCache.get("index.html");
    const entryUrl = importsTransform.toHashedUrl(ENTRY_POINT);
    return {
      type: "html",
      content: content
        .toString()
        .replace(
          "<head>",
          `<head>\n    <script type="module" src="${clientUrl}"></script>`,
        )
        .replace(
          "</body>",
          `  <script type="module" src="${entryUrl}"></script>\n  </body>`,
        ),
      browserCache: false,
    };
  });

const cachedJS = (content: string | Buffer): LoadedFile => ({
  type: "js",
  content,
  browserCache: true,
});
