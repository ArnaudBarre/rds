import { readFileSync } from "fs";
import { transform } from "@parcel/css";

import { cache } from "./utils";
import { GraphNode } from "./types";

export const cssCache = cache(
  "css",
  (
    url: string,
  ): {
    code: string;
    imports: GraphNode["imports"];
    cssModule: false | { [key: string]: string };
  } => {
    const cssModule = url.endsWith(".module.css");
    const { code, dependencies, exports } = transform({
      filename: url,
      code: readFileSync(url),
      analyzeDependencies: true,
      cssModules: cssModule,
      drafts: { nesting: true },
      targets: { safari: 13 << 16 },
    });
    return {
      code: code.toString(),
      imports: dependencies.map((i) => [
        i.url,
        i.type === "url" ? i.placeholder : i.url,
      ]),
      cssModule: cssModule
        ? Object.fromEntries(
            Object.entries(exports!).map(([key, value]) => [key, value.name]),
          )
        : false,
    };
  },
);
