import { relative } from "node:path";
import { parse } from "es-module-lexer";
import { RDSError } from "./errors.ts";
import type { ResolvedConfig } from "./loadConfig.ts";
import { resolve } from "./resolve.ts";
import { run } from "./utils.ts";

export type JSImport = {
  n: string;
  r: string;
  dep: boolean;
  specifiers: [name: string, local: string][];
  s: number;
  e: number;
  ss: number;
  se: number;
};

export const scanImports = (
  url: string,
  code: string,
  packageImports: ResolvedConfig["packageImports"],
) => {
  const importSpecifiers = parse(code)[0];
  const localImports: JSImport[] = [];
  for (const i of importSpecifiers) {
    if (!i.n) continue; // dynamic, ex: import(variable), unhandled
    if (i.n.startsWith("https://")) continue; // external
    let r: string;
    let dep: boolean;
    if (i.n.startsWith("#")) {
      const packageImport = packageImports?.[i.n];
      if (packageImport === undefined) {
        throw new RDSError({
          message: `Subpath import "${i.n}" not set in package.json`,
          file: url,
        });
      }
      let subPathMapping: string;
      if (typeof packageImport === "string") {
        subPathMapping = packageImport;
      } else {
        const condition = packageImport["browser"] ?? packageImport["default"];
        if (condition === undefined) {
          throw new RDSError({
            message: `Subpath import "${i.n}" condition not supported`,
            file: url,
          });
        }
        subPathMapping = condition;
      }
      if (subPathMapping.startsWith(".")) {
        dep = false;
        r = relative(process.cwd(), subPathMapping);
      } else {
        dep = true;
        r = subPathMapping;
      }
    } else if (i.n.startsWith(".")) {
      dep = false;
      r = resolve(url, i.n);
    } else {
      dep = true;
      r = i.n;
    }
    localImports.push({
      n: i.n,
      r,
      dep,
      specifiers: dep
        ? run(() => {
            const statement = code.slice(i.ss, i.se);
            const index = statement.indexOf("{");
            if (index === -1) return [];
            return statement
              .slice(index + 1, statement.indexOf("}"))
              .split(",")
              .map((specifier) => {
                const parts = specifier.split(/\sas\s/);
                const name = parts[0].trim();
                return [name, parts[1] ? parts[1].trim() : name];
              });
          })
        : [],
      // https://github.com/guybedford/es-module-lexer/issues/144
      s: i.d === -1 ? i.s : i.s + 1,
      e: i.d === -1 ? i.e : i.e - 1,
      ss: i.ss,
      se: i.se,
    });
  }
  return localImports;
};
