import { parse } from "es-module-lexer";
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

export const scanImports = (url: string, code: string) => {
  const importSpecifiers = parse(code)[0];
  const localImports: JSImport[] = [];
  for (const i of importSpecifiers) {
    if (!i.n) continue; // dynamic, ex: import(variable), unhandled
    if (i.n.startsWith("https://")) continue; // external
    const dep = !i.n.startsWith(".");
    localImports.push({
      n: i.n,
      r: dep ? i.n : resolve(url, i.n),
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
