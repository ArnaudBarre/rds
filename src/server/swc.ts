import { ImportDeclaration, transformFile } from "@swc/core";
import { Visitor } from "@swc/core/Visitor";

import { cache } from "./utils";
import { extname } from "path";
import { NamedImportSpecifier } from "@swc/core/types";

const importReactRE = /(^|\n)import\s+(\*\s+as\s+)?React(,|\s+)/;

export const swcCache = cache<
  string,
  Promise<{ code: string; imports: AnalyzedImport[]; hasFastRefresh: boolean }>
>("swc", async (url) => {
  const visitor = new ImportsVisitor();

  let { code } = await transformFile(url, {
    configFile: false,
    swcrc: false,
    sourceMaps: "inline",
    plugin: (p) => visitor.visitProgram(p),
    jsc: {
      // https://github.com/swc-project/swc/issues/3297
      parser: extname(url).startsWith("t")
        ? { syntax: "typescript", tsx: url.endsWith("x") }
        : { syntax: "ecmascript", jsx: url.endsWith("x") },
      target: "es2020",
      transform: {
        react: { refresh: true, development: true, useBuiltins: true },
      },
    },
  });

  if (code.includes("React.createElement") && !importReactRE.test(code)) {
    code = `import React from "react";\n${code}`;
    visitor.imports.unshift({ source: "react", specifiers: [] });
  }

  return {
    code,
    imports: visitor.imports,
    hasFastRefresh: code.includes("$RefreshReg$"),
  };
});

export type AnalyzedImport = {
  source: string;
  specifiers: { name: string; local: string }[];
};

class ImportsVisitor extends Visitor {
  imports: AnalyzedImport[] = [];

  visitImportDeclaration(declaration: ImportDeclaration) {
    if (!declaration.typeOnly) {
      this.imports.push({
        source: declaration.source.value,
        specifiers: declaration.specifiers
          .filter(
            (s): s is NamedImportSpecifier => s.type === "ImportSpecifier",
          )
          .map((s) => ({
            local: s.local.value,
            name: s.imported?.value ?? s.local.value,
          })),
      });
    }
    return declaration;
  }
}
