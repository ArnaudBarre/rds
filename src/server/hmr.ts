import { FSWatcher } from "chokidar";

import { GraphNode } from "./types";
import { logger } from "./logger";
import { colors } from "./colors";
import { SWCCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { ImportsTransform } from "./importsTransform";
import { isCSS, isJS, isSVG } from "./utils";
import { CSSTransform } from "./css/cssTransform";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { WS } from "./ws";
import { CSSGenerator } from "./css/generator";
import { Scanner } from "./scan";

export const setupHmr = ({
  cssTransform,
  cssGenerator,
  srcWatcher,
  swcCache,
  scanner,
  importsTransform,
  ws,
}: {
  cssTransform: CSSTransform;
  cssGenerator: CSSGenerator;
  srcWatcher: FSWatcher;
  swcCache: SWCCache;
  scanner: Scanner;
  importsTransform: ImportsTransform;
  ws: WS;
}) => {
  const invalidate = (node: GraphNode) => {
    importsTransform.delete(node.url);
    for (const importer of node.importers) {
      invalidate(importer);
    }
  };

  const clearCache = (path: string) => {
    if (isJS(path)) {
      scanner.delete(path);
      cssGenerator.scanContentCache.delete(path);
      swcCache.delete(path);
    } else if (isCSS(path)) {
      scanner.delete(path);
      cssTransform.delete(path);
    } else if (isSVG(path)) {
      svgCache.delete(path);
      assetsCache.delete(path);
    } else {
      assetsCache.delete(path);
    }
  };

  srcWatcher
    .on("change", async (path) => {
      logger.debug(`change ${path}`);
      clearCache(path);
      const graphNode = scanner.graph.get(path)!;
      invalidate(graphNode);
      const updates = new Set<string>();
      if (propagateUpdate(graphNode, updates)) {
        logger.info(colors.green("page reload ") + colors.dim(path));
        ws.send({ type: "reload" });
      } else {
        logger.info(
          colors.green("hmr update ") +
            [...updates].map((update) => colors.dim(update)).join(", "),
        );
        const paths = await Promise.all(
          [...updates].map((url) => importsTransform.toHashedUrl(url)),
        ).catch(() => [] as string[]);
        if (paths.length) ws.send({ type: "update", paths });
      }
    })
    .on("unlink", (path) => {
      logger.debug(`unlink ${path}`);
      if (isJS(path)) {
        resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
      }
      clearCache(path);
      scanner.delete(path);
      importsTransform.delete(path);
      // TODO: Update importers if exists. Will throws and trigger the overlay
    });
};

const propagateUpdate = (
  node: GraphNode,
  updates: Set<string>,
): boolean /* hasDeadEnd */ => {
  if (node.selfUpdate) {
    updates.add(node.url);
    return false;
  }
  if (!node.importers.size) return true; // Reached entry point
  for (const importer of node.importers) {
    if (propagateUpdate(importer, updates)) return true;
  }
  return false;
};
