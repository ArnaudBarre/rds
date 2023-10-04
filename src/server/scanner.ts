import { cache } from "./cache.ts";
import { ENTRY_POINT } from "./consts.ts";
import { addDependency } from "./dependencies.ts";
import type { CSSImport, Downwind } from "./downwind.ts";
import { RDSError } from "./errors.ts";
import type { JSImport } from "./scanImports.ts";
import type { SWCCache } from "./swc.ts";
import type { Graph, GraphNode } from "./types.ts";
import { isCSS, isInnerNode, split } from "./utils.ts";
import type { WS } from "./ws.ts";

export type Scanner = ReturnType<typeof initScanner>;

export const initScanner = ({
  ws,
  // downwind,
  // swcCache,
  watchFile,
  ws,
}: {
  ws: WS;
  downwind: Downwind;
  swcCache: SWCCache;
  watchFile: (path: string) => void;
  ws: WS;
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
      downwind.scanCache.get(url);
      const oldSrcImports = graphNode.imports;
      const { code, imports, selfUpdate } = swcCache.get(url, true);
      graphNode.selfUpdate = selfUpdate;
      const [depsImports, srcImports] = split(imports, (imp) => imp.dep);
      graphNode.imports = srcImports.map((i) => i.r);

      for (const imp of depsImports) addDependency(imp.n, url);

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
      if (cssImportsToPrune.length) {
        ws.send({ type: "prune-css", paths: cssImportsToPrune });
      }

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

  return { ...scanCache, graph };
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  if (node.url === to) return true;
  for (const importer of node.importers) {
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
