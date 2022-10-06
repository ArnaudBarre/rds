import { FSWatcher } from "chokidar";

import { GraphNode } from "./types";
import { logger } from "./logger";
import { colors } from "./colors";
import { SWCCache } from "./swc";
import { resolveExtensionCache } from "./resolve";
import { ImportsTransform } from "./importsTransform";
import { isCSS, isJS, isSVG } from "./utils";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { WS } from "./ws";
import { Scanner } from "./scanner";
import { RDSError } from "./errors";
import { Downwind } from "./downwind";

export const setupHmr = ({
  downwind,
  srcWatcher,
  swcCache,
  scanner,
  importsTransform,
  lintFile,
  ws,
}: {
  downwind: Downwind;
  srcWatcher: FSWatcher;
  swcCache: SWCCache;
  scanner: Scanner;
  importsTransform: ImportsTransform;
  lintFile: (path: string) => void;
  ws: WS;
}) => {
  const invalidate = (node: GraphNode) => {
    importsTransform.delete(node.url);
    for (const importer of node.importers) {
      invalidate(importer);
    }
  };

  const clearCache = (
    path: string,
    update: boolean,
  ): true | undefined /* skipUpdate */ => {
    if (isJS(path)) {
      if (update) {
        try {
          const outputChanged = swcCache.update(path);
          if (!outputChanged) return true;
        } catch (error) {
          if (error instanceof RDSError) {
            logger.rdsError(error.payload);
            ws.send({ type: "error", error: error.payload });
          } else {
            console.error(error);
          }
          errorPaths.add(path);
          return true;
        }
      } else {
        swcCache.delete(path);
      }
      scanner.delete(path);
      downwind.scanCache.delete(path);
    } else if (isCSS(path)) {
      scanner.delete(path);
      downwind.transformCache.delete(path);
    } else if (isSVG(path)) {
      svgCache.delete(path);
      assetsCache.delete(path);
    } else {
      assetsCache.delete(path);
    }
  };

  const successPaths = new Set<string>();
  const errorPaths = new Set<string>();

  srcWatcher
    .on("change", (path) => {
      logger.debug(`change ${path}`);
      if (clearCache(path, true)) {
        // Type or whitespace only change, but can impact lint result
        lintFile(path);
        return;
      }
      const graphNode = scanner.graph.get(path)!;
      invalidate(graphNode);
      const updates = new Set<string>();
      if (propagateUpdate(graphNode, updates)) {
        logger.info(colors.green("page reload ") + colors.dim(path));
        ws.send({ type: "reload" });
        successPaths.clear();
        errorPaths.clear();
      } else {
        logger.info(
          colors.green("hmr update ") + colors.dim([...updates].join(", ")),
        );
        const filesToTransform = [...new Set([...errorPaths, ...updates])];
        let hasError = false;
        let errorSent = false;
        for (const url of filesToTransform) {
          try {
            const hmrUrl = importsTransform.toHashedUrl(url);
            successPaths.add(hmrUrl);
            errorPaths.delete(url);
          } catch (error) {
            hasError = true;
            errorPaths.add(url);
            if (error instanceof RDSError) {
              logger.rdsError(error.payload);
              if (!errorSent) {
                ws.send({ type: "error", error: error.payload });
                errorSent = true;
              }
            } else {
              console.error(error);
            }
          }
        }
        if (hasError) return;
        ws.send({ type: "update", paths: Array.from(successPaths) });
        errorPaths.clear();
        successPaths.clear();
      }
    })
    .on("unlink", (path) => {
      logger.debug(`unlink ${path}`);
      if (isJS(path)) {
        const pathWithoutExt = path.slice(0, path.lastIndexOf("."));
        resolveExtensionCache.delete(pathWithoutExt);
        if (pathWithoutExt.endsWith("/index")) {
          resolveExtensionCache.delete(pathWithoutExt.slice(0, -6));
        }
      } else if (isCSS(path)) {
        ws.send({ type: "prune-css", paths: [path] });
      }
      clearCache(path, false);
      const node = scanner.graph.get(path)!;
      invalidate(node);
      scanner.graph.delete(path);
      if (node.importers.size) {
        const importers = [...node.importers.values()].map((v) => v.url);
        const error = new RDSError({
          message: `File ${path} was deleted bu used in ${importers.join(
            ", ",
          )}`,
          file: importers[0],
        });
        logger.rdsError(error.payload);
        ws.send({ type: "error", error: error.payload });
      }
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
