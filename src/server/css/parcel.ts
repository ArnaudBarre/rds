import { transform } from "@parcel/css";

import { cache, readFileSync } from "../utils";
import { CSSModule, GraphNode } from "../types";
import { matchToken, ruleEntryToCSSEntries } from "./matcher";
import { getRuleMeta } from "./rules";

const applyRE = /\s@apply ([^;}\n]+)[;}\n]/g;

export const parcelCache = cache(
  "css",
  (
    url: string,
  ): {
    code: string;
    imports: GraphNode["imports"];
    cssModule: CSSModule;
    hasApply: boolean;
  } => {
    const cssModule = url.endsWith(".module.css");
    let content = readFileSync(url);
    const hasApply = content.includes("@apply ");
    if (hasApply) {
      content = content.replace(applyRE, (match, utils: string) => {
        let output = "";
        for (let token of utils.split(" ")) {
          if (!token) continue;
          const match = matchToken(token);
          if (match === undefined) {
            throw new Error(`No rule matching ${token} in ${url}`);
          }
          const meta = getRuleMeta(match.ruleEntry.rule);
          if (
            match.screen || // TODO: Find a way to make it working
            match.variants || // TODO: Use nesting if not media query
            meta?.selectorRewrite || // TODO: Use nesting if not media query
            meta?.addDefault || // TODO: Maybe it works if added in main
            meta?.addKeyframes || // TODO: Maybe it works if added in main
            meta?.addContainer
          ) {
            throw new Error(
              `${url}: Complex utils like ${token} are not supported`,
            );
          }
          for (const cssEntry of ruleEntryToCSSEntries(match.ruleEntry)) {
            output += `${cssEntry[0]}:${cssEntry[1]};`;
          }
        }
        return `${match[0]}${output}${match[match.length - 1]}`;
      });
    }

    const { code, dependencies, exports } = transform({
      filename: url,
      code: Buffer.from(content),
      analyzeDependencies: true,
      cssModules: cssModule,
      drafts: { nesting: true },
      targets: { safari: 13 << 16 },
    });
    return {
      code: code.toString(),
      imports: dependencies!.map((i) => [
        i.url,
        i.type === "url" ? i.placeholder : i.url,
      ]),
      cssModule: cssModule
        ? Object.fromEntries(
            Object.entries(exports!).map(([key, value]) => [key, value.name]),
          )
        : false,
      hasApply,
    };
  },
);
