import { cache } from "./cache";
import { isCSS, isInnerNode, split } from "./utils";
import { SWCCache } from "./swc";
import { ENTRY_POINT } from "./consts";
import { Graph, GraphNode } from "./types";
import { addDependency } from "./dependencies";
import { RDSError } from "./errors";
import { CSSImport, Downwind } from "./downwind";
import { JSImport } from "./scanImports";

export type Scanner = ReturnType<typeof initScanner>;

export const initScanner = ({
  downwind,
  swcCache,
  lintFile,
  watchFile,
}: {
  downwind: Downwind;
  swcCache: SWCCache;
  lintFile: (path: string) => void;
  watchFile: (path: string) => void;
}) => {
  const graph: Graph = new Map([
    [
      ENTRY_POINT,
      {
        url: ENTRY_POINT,
        selfUpdate: false,
        imports: [],
        importers: new Set(),
      },
    ],
  ]);

  let cssPruneCallback: ((paths: string[]) => void) | undefined;

  const scanCache = cache("scan", (url) => {
    const graphNode = graph.get(url)!;

    let output:
      | { isCSS: true; code: string; imports: CSSImport[] }
      | { isCSS: false; code: string; imports: JSImport[] };

    if (isCSS(url)) {
      const { code, imports, selfUpdate } = downwind.transformCache.get(url);
      graphNode.selfUpdate = selfUpdate;
      graphNode.imports = imports.map((i) => i[0]);
      output = { isCSS: true, code, imports };
    } else {
      lintFile(url);
      downwind.scanCache.get(url);
      const oldSrcImports = graphNode.imports;
      const { code, imports, selfUpdate } = swcCache.get(url, true);
      graphNode.selfUpdate = selfUpdate;
      const [depsImports, srcImports] = split(imports, (imp) => imp.dep);
      graphNode.imports = srcImports.map((i) => i.r);

      for (const imp of depsImports) addDependency(imp.n, url);

      // TODO: This can be done inside swcCache
      const cssImportsToPrune: string[] = [];
      for (const oldImp of oldSrcImports) {
        if (graphNode.imports.some((i) => oldImp === i)) continue;
        const prunedNode = graph.get(oldImp);
        if (!prunedNode) continue; // Removed a reference to a deleted file
        prunedNode.importers.delete(graphNode);
        if (isCSS(oldImp) && prunedNode.importers.size === 0) {
          cssImportsToPrune.push(oldImp);
        }
      }
      if (cssImportsToPrune.length) cssPruneCallback?.(cssImportsToPrune);

      output = { isCSS: false, code, imports };
    }

    for (const resolvedUrl of graphNode.imports) {
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
        watchFile(resolvedUrl);
        graph.set(resolvedUrl, {
          url: resolvedUrl,
          selfUpdate: false,
          imports: [],
          importers: new Set([graphNode]),
        });
      }
      if (isInnerNode(resolvedUrl)) scanCache.get(resolvedUrl);
    }

    return output;
  });

  return {
    ...scanCache,
    onCSSPrune: (callback: (paths: string[]) => void) =>
      (cssPruneCallback = callback),
    graph,
  };
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  if (node.url === to) return true;
  for (const importer of node.importers) {
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
