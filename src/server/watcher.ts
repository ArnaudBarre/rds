import { watch } from "chokidar";

import { GraphNode, HMRWebSocket } from "./types";
import { log } from "./logger";
import { colors } from "./colors";
import { swcCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { graph, TransformSrcImports } from "./transform";
import { isCSS } from "./utils";
import { cssCache } from "./css";

export const initSrcWatcher = (
  hmrWS: HMRWebSocket,
  transformSrcImports: TransformSrcImports,
) => {
  const invalidate = (node: GraphNode) => {
    transformSrcImports.delete(node.url);
    for (const importer of node.importers) {
      invalidate(importer);
    }
  };

  return watch(["src/**/*.[jt]s?(x)", "src/**/*.css"], { ignoreInitial: true })
    .on("add", (path) => {
      log.debug(`add ${path}`);
      if (!isCSS(path)) {
        resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
      }
    })
    .on("change", async (path) => {
      log.debug(`change ${path}`);
      (isCSS(path) ? cssCache : swcCache).delete(path);
      const graphNode = graph.get(path);
      if (graphNode) {
        invalidate(graphNode);
        const updates = new Set<string>();
        if (propagateUpdate(graphNode, updates)) {
          log.info(colors.green("page reload ") + colors.dim(path));
          hmrWS.send({ type: "reload" });
        } else {
          log.info(
            colors.green("hmr update ") +
              [...updates].map((update) => colors.dim(update)).join(", "),
          );
          hmrWS.send({
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
      if (!isCSS(path)) {
        resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
      }
      (isCSS(path) ? cssCache : swcCache).delete(path);
      transformSrcImports.delete(path);
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
