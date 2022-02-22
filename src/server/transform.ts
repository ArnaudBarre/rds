import { cache, getHashedUrl, isCSS, isInnerNode, isSVG, split } from "./utils";
import { AnalyzedImport, swcCache } from "./swc";
import { resolve } from "./resolve";
import { ENTRY_POINT, RDS_CLIENT } from "./consts";
import { Graph, GraphNode, HMRWebSocket } from "./types";
import { addDependency } from "./dependencies";
import { cssCache } from "./css";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";

export const graph: Graph = new Map([
  [
    ENTRY_POINT,
    { url: ENTRY_POINT, selfUpdate: false, imports: [], importers: new Set() },
  ],
]);

export type TransformSrcImports = ReturnType<typeof initTransformSrcImports>;

export const initTransformSrcImports = (
  ws: HMRWebSocket,
  watchFile: (url: string) => void,
) => {
  const transformSrcImportsCache = cache<
    string,
    Promise<{ code: string; depsImports: AnalyzedImport[] }>
  >("transform", async (url) => {
    const graphNode = graph.get(url)!;
    const oldSrcImports = graphNode.imports;

    let content: string;
    let depsImports: AnalyzedImport[] = [];

    const isCSSFile = isCSS(url);
    if (isCSSFile) {
      const { code, imports, cssModule } = cssCache.get(url);
      graphNode.selfUpdate = !cssModule; // Can't self accept because of modules exports
      graphNode.imports = imports;
      content = `import { updateStyle } from "/${RDS_CLIENT}";
updateStyle("${url}", ${JSON.stringify(code)});
${
  cssModule
    ? Object.entries(cssModule)
        .map(([key, value]) => `export const ${key} = "${value}";\n`)
        .concat(`export default { ${Object.keys(cssModule).join(", ")} };\n`)
        .join("")
    : ""
}`;
    } else {
      const { code, imports, hasFastRefresh } = await swcCache.get(url);
      graphNode.selfUpdate = hasFastRefresh;
      const [srcImports, _depsImports] = split(imports, (imp) =>
        imp.source.startsWith("."),
      );
      depsImports = _depsImports;
      graphNode.imports = srcImports.map((i) => [i.source, i.source]);

      for (const imp of depsImports) {
        addDependency(imp.source, ws);
      }

      content = hasFastRefresh
        ? `import { RefreshRuntime } from "/${RDS_CLIENT}";
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
    if (cssImportsToPrune.length) {
      ws.send({ type: "prune-css", paths: cssImportsToPrune });
    }

    for (const [imp, placeholder] of graphNode.imports) {
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
        watchFile(resolvedUrl);
        graph.set(resolvedUrl, {
          url: resolvedUrl,
          selfUpdate: false,
          imports: [],
          importers: new Set([graphNode]),
        });
      }
      if (isCSSFile) {
        if (isCSS(resolvedUrl)) {
          content = content.replace(
            new RegExp(`@import\\s+['"](${placeholder})['"]`),
            `@import "${await toHashedUrl(resolvedUrl)}"`,
          );
        } else {
          content = content.replace(
            placeholder,
            await toHashedUrl(resolvedUrl),
          );
        }
      } else {
        if (isInnerNode(resolvedUrl) || isSVG(resolvedUrl)) {
          content = content.replace(
            new RegExp(`(import|from)\\s+['"](${placeholder})['"]`),
            `$1 "${await toHashedUrl(resolvedUrl)}"`,
          );
        } else {
          content = content.replace(
            new RegExp(`import\\s+(\\S+)\\s+from\\s+['"](${placeholder})['"]`),
            `const $1 = "${await toHashedUrl(resolvedUrl)}"`,
          );
        }
      }
    }

    return { code: content, depsImports };
  });

  const toHashedUrl = async (url: string) =>
    `/${getHashedUrl(
      url,
      isInnerNode(url)
        ? (await transformSrcImportsCache.get(url)).code
        : isSVG(url)
        ? await svgCache.get(url)
        : await assetsCache.get(url),
    )}`;

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
