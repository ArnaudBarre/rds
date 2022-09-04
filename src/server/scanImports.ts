import { parse } from "es-module-lexer";
import { codeToFrame, RDSError } from "./errors";
import { resolve } from "./resolve";
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
    if (i.d !== -1) {
      throw new RDSError({
        message: "Dynamic imports are not supported (yet)",
        file: url,
        frame: codeToFrame(code.slice(i.ss, i.se), null),
      });
    }

    const dep = !i.n!.startsWith(".");
    return {
      n: i.n!,
      r: dep ? i.n! : resolve(url, stripQuery(i.n!)),
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
      s: i.s,
      e: i.e,
      ss: i.ss,
      se: i.se,
    };
  });
};

const stripQuery = (url: string) => {
  const index = url.indexOf("?");
  return index > -1 ? url.slice(0, index) : url;
};
