import { watch } from "chokidar";

import { GraphNode, HMRWebSocket } from "./types";
import { log } from "./logger";
import { colors } from "./colors";
import { swcCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { graph, TransformSrcImports } from "./transform";

export const initSrcWatcher = (
  hmrWS: HMRWebSocket,
  transformSrcImports: TransformSrcImports,
) => {
  const invalidate = (node: GraphNode) => {
    for (const importer of node.importers) {
      transformSrcImports.delete(node.url);
      invalidate(importer);
    }
  };

  return watch("src/**/*.[jt]s?(x)", { ignoreInitial: true })
    .on("add", (path) => {
      resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
    })
    .on("change", async (path) => {
      swcCache.delete(path);
      const graphNode = graph.get(path);
      if (graphNode) {
        invalidate(graphNode);
        const updates = new Set<string>();
        if (propagateUpdate(graphNode, updates)) {
          log(colors.green("page reload ") + colors.dim(path));
          hmrWS.send({ type: "reload" });
        } else {
          log(
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
      resolveExtensionCache.delete(path.slice(0, path.lastIndexOf(".")));
      transformSrcImports.delete(path);
      swcCache.delete(path);
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
