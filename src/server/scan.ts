import { cache, isCSS, isInnerNode, split } from "./utils";
import { AnalyzedImport, SWCCache } from "./swc";
import { resolve } from "./resolve";
import { ENTRY_POINT } from "./consts";
import { Graph, GraphNode } from "./types";
import { addDependency } from "./dependencies";
import { CSSGenerator } from "./css/generator";
import { CSSTransform } from "./css/cssTransform";
import { cssToHMR, getClientUrl } from "./getClient";

export type Scanner = ReturnType<typeof initScan>;

export const initScan = ({
  cssGenerator,
  cssTransform,
  swcCache,
  lintFile,
  watchFile,
}: {
  cssGenerator: CSSGenerator;
  cssTransform: CSSTransform;
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

  let onNewDepCallback: (() => void) | undefined;
  let cssPruneCallback: ((paths: string[]) => void) | undefined;

  const scanCache = cache("scan", async (url) => {
    const graphNode = graph.get(url)!;
    const oldSrcImports = graphNode.imports;

    let content: string;
    let depsImports: AnalyzedImport[] = [];

    const isCSSFile = isCSS(url);
    if (isCSSFile) {
      const { code, imports, cssModule } = await cssTransform.get(url);
      graphNode.selfUpdate = !cssModule; // Can't self accept because of modules exports
      graphNode.imports = imports;
      content = cssToHMR(url, code, cssModule);
    } else {
      lintFile(url);
      const [{ code, imports, hasFastRefresh }] = await Promise.all([
        swcCache.get(url),
        cssGenerator.scanContentCache.get(url),
      ]);
      graphNode.selfUpdate = hasFastRefresh;
      const [srcImports, _depsImports] = split(imports, (imp) =>
        imp.source.startsWith("."),
      );
      depsImports = _depsImports;
      graphNode.imports = srcImports.map((i) => [
        stripQuery(i.source),
        i.source,
      ]);

      for (const imp of depsImports) {
        addDependency(imp.source, onNewDepCallback);
      }

      content = hasFastRefresh
        ? `import { RefreshRuntime } from "${getClientUrl()}";
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${url}")
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${code}

window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
RefreshRuntime.enqueueUpdate();
`
        : code;
    }

    const cssImportsToPrune: string[] = [];
    for (const [oldImp] of oldSrcImports) {
      if (graphNode.imports.some(([i]) => oldImp === i)) continue;
      const impUrl = resolve(url, oldImp);
      graph.get(impUrl)!.importers.delete(graphNode);
      if (isCSS(impUrl) && graph.get(impUrl)!.importers.size === 0) {
        cssImportsToPrune.push(impUrl);
      }
    }
    if (cssImportsToPrune.length) cssPruneCallback?.(cssImportsToPrune);

    for (const [imp] of graphNode.imports) {
      const resolvedUrl = resolve(url, imp);
      const impGraphNode = graph.get(resolvedUrl);
      if (impGraphNode) {
        if (!impGraphNode.importers.has(graphNode)) {
          if (hasCycle(graphNode, impGraphNode.url)) {
            throw new Error(
              `Found cycle between ${graphNode.url} & ${impGraphNode.url}`,
            );
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
      if (isInnerNode(resolvedUrl)) await scanCache.get(resolvedUrl);
    }

    return { code: content, depsImports, imports: graphNode.imports };
  });

  return {
    ...scanCache,
    onCSSPrune: (callback: (paths: string[]) => void) =>
      (cssPruneCallback = callback),
    onNewDep: (callback: () => void) => (onNewDepCallback = callback),
    graph,
  };
};

const stripQuery = (url: string) => {
  const index = url.indexOf("?");
  return index > -1 ? url.slice(0, index) : url;
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  if (node.url === to) return true;
  for (const importer of node.importers) {
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
