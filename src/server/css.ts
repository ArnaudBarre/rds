import { readFileSync } from "fs";
import { transform } from "@parcel/css";

import { cache } from "./utils";

export const cssCache = cache("css", (url: string) => {
  const { code, map, dependencies } = transform({
    filename: url,
    code: readFileSync(url),
    sourceMap: true,
    analyzeDependencies: true,
    targets: { safari: 13 << 16 },
  });
  return {
    code: `${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
      JSON.stringify(map),
    ).toString("base64")}\n`,
    dependencies,
  };
});
