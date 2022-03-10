import { transform } from "@parcel/css";

import { mapObjectValue } from "../utils";

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
}) => {
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
    imports:
      dependencies?.map((i): [string, string] => [
        i.url,
        i.type === "url" ? i.placeholder : i.url,
      ]) ?? [],
    cssModule: cssModule
      ? mapObjectValue(exports!, (v) => v.name)
      : (false as const),
  };
};
