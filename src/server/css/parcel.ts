import { Dependency, transform } from "@parcel/css";

import { mapObjectValue } from "../utils";
import { CSSModule } from "../types";

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
  const {
    code: buffer,
    dependencies,
    exports,
  } = transform({
    filename: url,
    code: Buffer.from(code),
    cssModules: cssModule,
    analyzeDependencies,
    drafts: { nesting },
    targets: { safari: 13 << 16 }, // eslint-disable-line no-bitwise
    minify,
  });
  return {
    code: buffer.toString(),
    imports: dependencies?.map((d) => [d.url, getPlaceholder(d)]) ?? [],
    cssModule: cssModule ? mapObjectValue(exports!, (v) => v.name) : false,
  };
};

const getPlaceholder = (dependency: Dependency) => {
  if (dependency.type === "import") {
    throw new Error("CSS imports are not supported");
  }
  return dependency.placeholder;
};
