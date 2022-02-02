import fs from "fs";
import { join, dirname, extname } from "path";
import { ImportDeclaration, transformFile } from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import { watch } from "chokidar";

import { LoadedFile, HMRWebSocket } from "./types";
import { MODULE_PREFIX, RDS_CLIENT } from "./consts";
import { cache, getHash, readFile } from "./utils";

const importReactRE = /(^|\n)import\s+(\*\s+as\s+)?React(,|\s+)/;

export const SWC_REGEX = /\.[jt]sx?$/;

export const initSwc = (hmrWS: HMRWebSocket, alias: Record<string, string>) => {
  const swcCache = cache<string, Promise<LoadedFile>>(async (url) => {
    const visitor = new ImportsVisitor();

    let { code } = await transformFile(url, {
      configFile: false,
      swcrc: false,
      sourceMaps: "inline",
      plugin: (p) => visitor.visitProgram(p),
      jsc: {
        // https://github.com/swc-project/swc/issues/3297
        parser: { syntax: "typescript", tsx: url.endsWith("x") },
        target: "es2020",
        transform: {
          react: { refresh: true, development: true, useBuiltins: true },
        },
      },
    });

    if (code.includes("React.createElement") && !importReactRE.test(code)) {
      code = `import React from "react";\n${code}`;
      visitor.imports.unshift("react");
    }

    const entries = await Promise.all(
      visitor.imports.map(async (imp) => [
        imp,
        imp.startsWith(".")
          ? await getHashedPath(join(dirname(url), imp))
          : alias[imp]
          ? await getHashedPath(alias[imp])
          : `${MODULE_PREFIX}/${imp}`,
      ]),
    );

    for (const [imp, hashedUrl] of entries) {
      code = code.replace(
        new RegExp(`from\\s+['"](${imp})['"]`),
        `from "/${hashedUrl}"`,
      );
    }

    if (!code.includes("$RefreshReg$")) return { content: code, type: "tsx" };

    const header = `import { RefreshRuntime } from "${RDS_CLIENT}";

let prevRefreshReg;
let prevRefreshSig;

if (!window.$RefreshReg$) throw new Error("React refresh preamble was not loaded. Something is wrong.");

prevRefreshReg = window.$RefreshReg$;
prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${url}")
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
`;

    const footer = `
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
import.meta.hot.accept();
RefreshRuntime.enqueueUpdate();`;

    return { content: `${header}${code}${footer}`, type: "tsx" };
  });

  const srcWatcher = watch("src/**/*.[jt]s?(x)", { ignoreInitial: true })
    .on("change", (path) => {
      hashCache.delete(path);
      swcCache.delete(path);
      hmrWS.send({ type: "update", path });
    })
    .on("unlink", (path) => {
      resolveCache.delete(path.slice(0, path.lastIndexOf(".")));
      swcCache.delete(path);
      hashCache.delete(path);
      // TODO: Update importers if exists. Will throws and trigger the overlay
    });

  return { swcTransform: swcCache.get, srcWatcher };
};

class ImportsVisitor extends Visitor {
  imports: string[] = [];

  visitImportDeclaration(declaration: ImportDeclaration) {
    if (!declaration.typeOnly) this.imports.push(declaration.source.value);
    return declaration;
  }
}

const hashCache = cache<string, Promise<string>>(async (path) =>
  getHash(await readFile(path)),
);
const getHashedPath = async (url: string) => {
  const path = resolveLocalFile(url);
  return `${path}?h=${await hashCache.get(path)}`;
};

const EXTENSIONS = ["tsx", "ts", "jsx", "js"] as const;
const resolveCache = cache<string, typeof EXTENSIONS[number]>((url) => {
  for (const extension of EXTENSIONS) {
    if (fs.existsSync(`${url}.${extension}`)) return extension;
  }
  throw new Error(`Unresolved import: ${url}`);
});
const resolveLocalFile = (url: string) => {
  const ext = extname(url);
  if (ext) return url;
  const resolvedExtension = resolveCache.get(url);
  return `${url}.${resolvedExtension}`;
};
