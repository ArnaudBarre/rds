import { GraphNode } from "./types";
import { log } from "./logger";
import { colors } from "./colors";
import { swcCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { graph, transformSrcImports } from "./transform";
import { isCSS, isJS, isSVG } from "./utils";
import { parcelCache } from "./css/parcel";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { ws } from "./ws";
import { srcWatcher } from "./srcWatcher";
import { cssGenerator } from "./css/generator";

export const setupHmr = () => {
  const invalidate = (node: GraphNode) => {
    transformSrcImports.delete(node.url);
    for (const importer of node.importers) {
      invalidate(importer);
    }
  };

  srcWatcher
    .on("change", async (path) => {
      log.debug(`change ${path}`);
      clearCache(path);
      const graphNode = graph.get(path);
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
              [...updates].map(transformSrcImports.toHashedUrl),
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
      transformSrcImports.delete(path);
      // TODO: Update importers if exists. Will throws and trigger the overlay
    });
};

const clearCache = (path: string) => {
  if (isJS(path)) {
    cssGenerator.scanContentCache.delete(path);
    swcCache.delete(path);
  } else if (isCSS(path)) parcelCache.delete(path);
  else if (isSVG(path)) svgCache.delete(path);
  else assetsCache.delete(path);
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
