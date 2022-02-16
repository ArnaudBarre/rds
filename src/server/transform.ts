import { cache, getHashedUrl, split } from "./utils";
import { AnalyzedImport, swcCache } from "./swc";
import { resolve } from "./resolve";
import { ENTRY_POINT, RDS_CLIENT } from "./consts";
import { Graph, GraphNode, HMRWebSocket } from "./types";
import { addDependency } from "./dependencies";

export const graph: Graph = new Map([
  [
    ENTRY_POINT,
    { url: ENTRY_POINT, selfUpdate: false, imports: [], importers: new Set() },
  ],
]);

export type TransformSrcImports = ReturnType<typeof initTransformSrcImports>;

export const initTransformSrcImports = (ws: HMRWebSocket) => {
  const transformSrcImportsCache = cache<
    string,
    Promise<{ code: string; depsImports: AnalyzedImport[] }>
  >("transform", async (url) => {
    let { code, imports, hasFastRefresh } = await swcCache.get(url);

    const graphNode = graph.get(url)!;
    graphNode.selfUpdate = hasFastRefresh;
    const oldSrcImports = graphNode.imports;
    const [srcImports, depsImports] = split(imports, (imp) =>
      imp.source.startsWith("."),
    );
    graphNode.imports = srcImports.map((i) => i.source);

    const importsToPrune = oldSrcImports.filter(
      (it) => !graphNode.imports.includes(it),
    );
    if (importsToPrune.length) {
      ws.send({ type: "prune", paths: importsToPrune });
      for (const importToPrune of importsToPrune) {
        graph.get(resolve(url, importToPrune))!.importers.delete(graphNode);
      }
    }

    for (const imp of graphNode.imports) {
      const resolvedUrl = resolve(url, imp);
      const impGraphNode = graph.get(resolvedUrl);
      if (impGraphNode) {
        if (!impGraphNode.importers.has(graphNode)) {
          console.log(
            `TODO: Check has cycle ${graphNode.url} -> ${impGraphNode.url}`,
          );
          impGraphNode.importers.add(graphNode);
        }
      } else {
        graph.set(resolvedUrl, {
          url: resolvedUrl,
          selfUpdate: false,
          imports: [],
          importers: new Set([graphNode]),
        });
      }
      code = code.replace(
        new RegExp(`from\\s+['"](${imp})['"]`),
        `from "${await toHashedUrl(resolvedUrl)}"`,
      );
    }

    for (const imp of depsImports) {
      addDependency(imp.source, ws);
    }

    return {
      depsImports,
      code: hasFastRefresh
        ? `import { RefreshRuntime, createHotContext } from "/${RDS_CLIENT}";
import.meta.hot = createHotContext("${url}");
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${url}")
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${code}

window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
import.meta.hot.accept();
RefreshRuntime.enqueueUpdate();
`
        : code,
    };
  });

  const toHashedUrl = async (url: string) =>
    `/${getHashedUrl(url, (await transformSrcImportsCache.get(url)).code)}`;

  return {
    ...transformSrcImportsCache,
    toHashedUrl,
  };
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  for (const importer of node.importers) {
    if (importer.url === to) return true;
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
