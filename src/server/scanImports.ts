import { parse } from "es-module-lexer";
import { resolveJSImport } from "./resolve";
import { run } from "./utils";

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

export const scanImports = (url: string, code: string) => {
  const importSpecifiers = parse(code)[0];
  return importSpecifiers.map((i): JSImport => {
    const dep = !i.n!.startsWith(".");
    return {
      n: i.n!,
      r: dep ? i.n! : resolveJSImport(url, stripQuery(i.n!)),
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
    };
  });
};

const stripQuery = (url: string) => {
  const index = url.indexOf("?");
  return index > -1 ? url.slice(0, index) : url;
};
