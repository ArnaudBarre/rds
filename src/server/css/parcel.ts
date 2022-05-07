import { Dependency, transform, TransformResult } from "@parcel/css";

import { mapObjectValue } from "../utils";
import { CSSModule } from "../types";
import { codeToFrame, RDSError } from "../errors";

export const parcel = ({
  url,
  code,
  nesting = false,
  analyzeDependencies,
  minify,
}: {
  url: string;
  code: string;
  nesting?: boolean;
  analyzeDependencies?: boolean;
  minify?: boolean;
}): { code: string; imports: [string, string][]; cssModule: CSSModule } => {
  const cssModule = url.endsWith(".module.css");
  let transformResult: TransformResult | undefined;
  try {
    transformResult = transform({
      filename: url,
      code: Buffer.from(code),
      cssModules: cssModule,
      analyzeDependencies,
      drafts: { nesting },
      targets: { safari: 13 << 16 }, // eslint-disable-line no-bitwise
      minify,
    });
  } catch (error) {
    const e = error as {
      message: string;
      source: string;
      loc: { line: number; column: number };
    };
    throw RDSError({
      message: e.message,
      file: `${url}:${e.loc.line}:${e.loc.column}`,
      frame: getFrame(code, e.loc.line),
    });
  }

  return {
    code: transformResult.code.toString(),
    imports:
      transformResult.dependencies?.map((d) => [
        d.url,
        getPlaceholder(d, code),
      ]) ?? [],
    cssModule: cssModule
      ? mapObjectValue(transformResult.exports!, (v) => v.name)
      : false,
  };
};

const getPlaceholder = (dependency: Dependency, code: string) => {
  if (dependency.type === "import") {
    throw RDSError({
      message: "CSS imports are not supported",
      file: `${dependency.loc.filePath}:${dependency.loc.start.line}:${dependency.loc.start.column}`,
      frame: getFrame(code, dependency.loc.start.line),
    });
  }
  return dependency.placeholder;
};

const getFrame = (code: string, line: number) => {
  let index = 0;
  let currentLine = 1;
  while (currentLine !== line) {
    index = code.indexOf("\n", index) + 1;
    currentLine++;
  }
  return codeToFrame(code.slice(index, code.indexOf("\n", index)), line);
};
