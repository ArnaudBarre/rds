import { cache, getHashedUrl, isCSS, isInnerNode, isSVG, split } from "./utils";
import { AnalyzedImport, swcCache } from "./swc";
import { resolve } from "./resolve";
import { ENTRY_POINT, RDS_CLIENT } from "./consts";
import { Graph, GraphNode } from "./types";
import { addDependency } from "./dependencies";
import { svgCache } from "./svg";
import { assetsCache } from "./assets";
import { cssToHMR } from "./css/utils/hmr";
import { CSSGenerator } from "./css/generator";
import { CSSTransform } from "./css/cssTransform";

export type ImportsTransform = ReturnType<typeof initImportsTransform>;

export const initImportsTransform = ({
  cssGenerator,
  cssTransform,
  lintFile,
  watchFile,
}: {
  cssGenerator: CSSGenerator;
  cssTransform: CSSTransform;
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

  const transformSrcImportsCache = cache<
    Promise<{ code: string; depsImports: AnalyzedImport[] }>
  >("transform", async (url) => {
    const graphNode = graph.get(url)!;
    const oldSrcImports = graphNode.imports;

    let content: string;
    let depsImports: AnalyzedImport[] = [];

    const isCSSFile = isCSS(url);
    if (isCSSFile) {
      const { code, imports, cssModule } = cssTransform.get(url);
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
      graphNode.imports = srcImports.map((i) => [i.source, i.source]);

      for (const imp of depsImports) {
        addDependency(imp.source, onNewDepCallback);
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
    if (cssImportsToPrune.length) cssPruneCallback?.(cssImportsToPrune);

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
            new RegExp(`@import\\s+['"]${placeholder}['"]`),
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
            new RegExp(`(import|from)\\s+['"]${placeholder}['"]`),
            `$1 "${await toHashedUrl(resolvedUrl)}"`,
          );
        } else {
          content = content.replace(
            new RegExp(`import\\s+(\\S+)\\s+from\\s+['"]${placeholder}['"]`),
            `const $1 = "${await toHashedUrl(resolvedUrl)}"`,
          );
        }
      }
    }

    return { code: content, depsImports };
  });

  const toHashedUrl = async (url: string) =>
    getHashedUrl(
      url,
      isInnerNode(url)
        ? (await transformSrcImportsCache.get(url)).code
        : isSVG(url)
        ? await svgCache.get(url)
        : await assetsCache.get(url),
    );

  return {
    ...transformSrcImportsCache,
    onCSSPrune: (callback: (paths: string[]) => void) =>
      (cssPruneCallback = callback),
    onNewDep: (callback: () => void) => (onNewDepCallback = callback),
    toHashedUrl,
    graph,
  };
};

const hasCycle = (node: GraphNode, to: string): boolean => {
  for (const importer of node.importers) {
    if (importer.url === to) return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (hasCycle(importer, to)) return true;
  }
  return false;
};
