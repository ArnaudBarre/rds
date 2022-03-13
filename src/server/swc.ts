import { ImportDeclaration, transformFile } from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import {
  ExportAllDeclaration,
  ExportNamedDeclaration,
  NamedImportSpecifier,
} from "@swc/core/types";

import { cache, getExtension } from "./utils";
import { ResolvedConfig } from "./loadConfig";

const importReactRE = /(^|\n)import\s+(\*\s+as\s+)?React(,|\s+)/;

export type SWCCache = ReturnType<typeof initSWC>;

export const initSWC = (config: ResolvedConfig) =>
  cache<
    Promise<{
      code: string;
      imports: AnalyzedImport[];
      hasFastRefresh: boolean;
    }>
  >("swc", async (url) => {
    const visitor = new ImportsVisitor();

    let { code } = await transformFile(url, {
      configFile: false,
      swcrc: false,
      sourceMaps: "inline",
      plugin: (p) => visitor.visitProgram(p),
      jsc: {
        // https://github.com/swc-project/swc/issues/3297
        parser: getExtension(url).startsWith("t")
          ? { syntax: "typescript", tsx: url.endsWith("x") }
          : { syntax: "ecmascript", jsx: url.endsWith("x") },
        target: "es2020",
        transform: {
          react: { refresh: true, development: true, useBuiltins: true },
          optimizer: { globals: { vars: config.define } },
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

  visitExportAllDeclaration(declaration: ExportAllDeclaration) {
    this.imports.push({ source: declaration.source.value, specifiers: [] });
    return declaration;
  }

  visitExportNamedDeclaration(declaration: ExportNamedDeclaration) {
    if (declaration.source) {
      this.imports.push({ source: declaration.source.value, specifiers: [] });
    }
    return declaration;
  }
}
