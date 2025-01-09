import { statSync } from "node:fs";
import { cache } from "./cache.ts";
import { ENTRY_POINT } from "./consts.ts";
import { addDependency } from "./dependencies.ts";
import type { CSSImport, Downwind } from "./downwind.ts";
import { RDSError } from "./errors.ts";
import type { OXCCache } from "./oxc.ts";
import type { JSImport } from "./scanImports.ts";
import type { Graph, GraphNode } from "./types.ts";
import { isCSS, isInnerNode, split } from "./utils.ts";

export type Scanner = ReturnType<typeof initScanner>;

export const initScanner = ({
  downwind,
  oxcCache,
  lintFile,
  watchFile,
}: {
  downwind: Downwind;
  oxcCache: OXCCache;
  lintFile: (path: string) => void;
  watchFile: (path: string) => void;
}) => {
  const graph: Graph = new Map([
    [
      ENTRY_POINT,
      {
        url: ENTRY_POINT,
        selfUpdate: false,
        srcAndCSSImports: [],
        srcImports: [],
        importers: new Set(),
      },
    ],
  ]);

  const scanCache = cache("scan", (url) => {
    const graphNode = graph.get(url)!;

    let output:
      | { isCSS: true; code: string; imports: CSSImport[] }
      | { isCSS: false; code: string; imports: JSImport[] };

    if (isCSS(url)) {
      const { code, imports, selfUpdate } = downwind.transformCache.get(url);
      graphNode.selfUpdate = selfUpdate;
      graphNode.srcImports = imports.map((i) => i[1]);
      output = { isCSS: true, code, imports };
    } else {
      lintFile(url);
      downwind.scanCache.get(url);
      const oldSrcImports = graphNode.srcImports;
      const { code, imports, selfUpdate } = oxcCache.get(url, true);
      graphNode.selfUpdate = selfUpdate;
      graphNode.srcAndCSSImports = imports
        .filter((i) => !i.dep || i.r.endsWith(".css"))
        .map((i) => i.r);
      const [depsImports, srcImports] = split(imports, (imp) => imp.dep);
      graphNode.srcImports = srcImports.map((i) => i.r);

      for (const imp of depsImports) addDependency(imp.n, url);

      for (const oldImp of oldSrcImports) {
        if (graphNode.srcImports.some((i) => oldImp === i)) continue;
        const prunedNode = graph.get(oldImp);
        if (!prunedNode) continue; // Removed a reference to a deleted file
        prunedNode.importers.delete(graphNode);
      }

      output = { isCSS: false, code, imports };
    }

    for (const resolvedUrl of graphNode.srcImports) {
      const impGraphNode = graph.get(resolvedUrl);
      if (impGraphNode) {
        if (!impGraphNode.importers.has(graphNode)) {
          if (hasCycle(graphNode, impGraphNode.url)) {
            throw new RDSError({
              message: `Found cycle between ${graphNode.url} & ${impGraphNode.url}`,
              file: impGraphNode.url,
            });
          }
          impGraphNode.importers.add(graphNode);
        }
      } else {
        const result = statSync(resolvedUrl, { throwIfNoEntry: false });
        if (!result?.isFile()) {
          throw new RDSError({
            message: `${resolvedUrl} is not a file`,
            file: url,
          });
        }
        watchFile(resolvedUrl);
        graph.set(resolvedUrl, {
          url: resolvedUrl,
          selfUpdate: false,
          srcAndCSSImports: [],
          srcImports: [],
          importers: new Set([graphNode]),
        });
      }
      if (isInnerNode(resolvedUrl)) scanCache.get(resolvedUrl);
    }

    return output;
  });

  const getCSSList = () => {
    const files: string[] = [];
    const findCSSImports = (node: GraphNode | undefined) => {
      if (!node) return;
      for (const imp of node.srcAndCSSImports) {
        if (imp.endsWith(".css") && !files.includes(imp)) files.push(imp);
        findCSSImports(graph.get(imp));
      }
    };
    findCSSImports(graph.get(ENTRY_POINT));
    return files;
  };

  return { ...scanCache, graph, getCSSList };
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  if (node.url === to) return true;
  for (const importer of node.importers) {
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
