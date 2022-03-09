import { FSWatcher } from "chokidar";

import { GraphNode } from "./types";
import { log } from "./logger";
import { colors } from "./colors";
import { swcCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { ImportsTransform } from "./importsTransform";
import { isCSS, isJS, isSVG } from "./utils";
import { CSSTransform } from "./css/cssTransform";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { WS } from "./ws";
import { CSSGenerator } from "./css/generator";

export const setupHmr = ({
  importsTransform,
  cssGenerator,
  cssTransform,
  srcWatcher,
  ws,
}: {
  importsTransform: ImportsTransform;
  cssTransform: CSSTransform;
  cssGenerator: CSSGenerator;
  srcWatcher: FSWatcher;
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
      cssGenerator.scanContentCache.delete(path);
      swcCache.delete(path);
    } else if (isCSS(path)) {cssTransform.delete(path);}
    else if (isSVG(path)) {svgCache.delete(path);}
    else {assetsCache.delete(path);}
  };

  srcWatcher
    .on("change", async (path) => {
      log.debug(`change ${path}`);
      clearCache(path);
      const graphNode = importsTransform.graph.get(path);
      if (graphNode) {
        invalidate(graphNode);
        const updates = new Set<string>();
        if (propagateUpdate(graphNode, updates)) {
          log.info(colors.green("page reload ") + colors.dim(path));
          ws.send({ type: "reload" });
        } else {
          log.info(
            colors.green("hmr update ") +
              [...updates].map((update) => colors.dim(update)).join(", "),
          );
          ws.send({
            type: "update",
            paths: await Promise.all(
              [...updates].map(importsTransform.toHashedUrl),
            ),
          });
        }
      }
    })
    .on("unlink", (path) => {
      log.debug(`unlink ${path}`);
      if (isJS(path)) {
        resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
      }
      clearCache(path);
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
