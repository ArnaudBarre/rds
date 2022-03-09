import { transform } from "@parcel/css";

import { cache, readFileSync } from "../utils";
import { CSSModule, GraphNode } from "../types";
import { toCSSEntries, getRuleMeta, TokenParser } from "./tokenParser";
import { VariantsMap } from "./variants";

const applyRE = /\s@apply ([^;}\n]+)[;}\n]/g;
const screenRE = /@screen ([^{]+){/g;

export type CSSTransform = ReturnType<typeof getCSSTransform>;

export const getCSSTransform = ({
  tokenParser,
  variantsMap,
}: {
  tokenParser: TokenParser;
  variantsMap: VariantsMap;
}) =>
  cache(
    "css",
    (
      url,
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
        content = content.replace(applyRE, (substring, utils: string) => {
          let output = "";
          for (const token of utils.split(" ")) {
            if (!token) continue;
            const match = tokenParser(token);
            if (match === undefined) {
              throw new Error(`No rule matching ${token} in ${url}`);
            }
            const meta = getRuleMeta(match.ruleEntry.rule);
            if (
              match.screen || // TODO: Find a way to make it working
              match.variants.length || // TODO: Use nesting if not media query
              meta?.selectorRewrite || // TODO: Use nesting if not media query
              meta?.addDefault || // TODO: Maybe it works if added in main
              meta?.addKeyframes || // TODO: Maybe it works if added in main
              meta?.addContainer
            ) {
              throw new Error(
                `${url}: Complex utils like ${token} are not supported. You can use @screen for media variants.`,
              );
            }
            for (const cssEntry of toCSSEntries(match.ruleEntry)) {
              output += `${cssEntry[0]}:${cssEntry[1]};`;
            }
          }
          return `${substring[0]}${output}${substring.at(-1)!}`;
        });
      }

      const hasScreen = content.includes("@screen ");
      if (hasScreen) {
        content = content.replace(screenRE, (_, rawValue: string) => {
          const value = rawValue.trim();
          const variant = variantsMap.get(value);
          if (variant === undefined) {
            throw new Error(`No variant matching ${value} in ${url}`);
          }
          if (!variant.media) {
            throw new Error(`${url}: ${value} is not a screen variant`);
          }
          return `@media ${variant.media} {`;
        });
      }

      const { code, dependencies, exports } = transform({
        filename: url,
        code: Buffer.from(content),
        analyzeDependencies: true,
        cssModules: cssModule,
        drafts: { nesting: true },
        targets: { safari: 13 << 16 }, // eslint-disable-line no-bitwise
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
        hasApply,
      };
    },
  );
