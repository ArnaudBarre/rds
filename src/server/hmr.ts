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
import { isRDSError, RDSError } from "./errors";

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

  const successPaths = new Set<string>();
  const errorPaths = new Set<string>();

  srcWatcher
    .on("change", (path) => {
      logger.debug(`change ${path}`);
      clearCache(path);
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
          colors.green("hmr update ") +
            [...updates].map((update) => colors.dim(update)).join(", "),
        );
        const filesToTransform = [...new Set([...errorPaths, ...updates])];
        Promise.allSettled(
          filesToTransform.map((url) => importsTransform.toHashedUrl(url)),
        ).then((results) => {
          let hasError = false;
          let errorSent = false;
          for (const [index, result] of results.entries()) {
            if (result.status === "fulfilled") {
              successPaths.add(result.value);
              errorPaths.delete(filesToTransform[index]);
            } else {
              hasError = true;
              errorPaths.add(filesToTransform[index]);
              const error = result.reason;
              if (isRDSError(error)) {
                logger.rdsError(error);
                if (!errorSent) {
                  ws.send({ type: "error", error });
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
        });
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
      clearCache(path);
      const node = scanner.graph.get(path)!;
      invalidate(node);
      scanner.graph.delete(path);
      if (node.importers.size) {
        const importers = [...node.importers.values()].map((v) => v.url);
        const error = RDSError({
          message: `File ${path} was deleted bu used in ${importers.join(
            ", ",
          )}`,
          file: importers[0],
        });
        logger.rdsError(error);
        ws.send({ type: "error", error });
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
