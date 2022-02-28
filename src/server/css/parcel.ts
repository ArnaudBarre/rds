import { transform } from "@parcel/css";

import { cache, readFileSync } from "../utils";
import { CSSModule, GraphNode } from "../types";
import { getRuleIndexMatch, matchToCSSObject, rules } from "./matcher";
import { CSSEntries, SelectorRewrite } from "./types";

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
        const tokens = utils.split(" ").filter((t) => t);
        const cssEntries: CSSEntries = [];
        for (let token of tokens) {
          const index = getRuleIndexMatch(token);
          if (index === undefined) {
            throw new Error(`No rule matching ${token} in ${url}`);
          }
          const rewrite: SelectorRewrite | undefined = rules[index][3];
          if (rewrite) {
            // TODO
            throw new Error(
              `${url}: Complex utils like ${token} are not supported`,
            );
          }
          cssEntries.push(...Object.entries(matchToCSSObject([index, token])));
        }
        const css = cssEntries
          .map(([key, value]) => `${key}: ${value};`)
          .join(" ");
        return `${match[0]}${css}${match[match.length - 1]}`;
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
