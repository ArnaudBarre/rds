import { readFile } from "../utils";
import { getRuleMeta, toCSSEntries, TokenParser } from "./tokenParser";
import { VariantsMap } from "./variants";
import { codeToFrame, RDSError } from "../errors";

const applyRE = /\s@apply ([^;}\n]+)[;}\n]/g;
const screenRE = /@screen ([^{]+){/g;

export type CSSPreTransform = ReturnType<typeof getCSSPreTransform>;

export const getCSSPreTransform =
  ({
    tokenParser,
    variantsMap,
  }: {
    tokenParser: TokenParser;
    variantsMap: VariantsMap;
  }) =>
  async (url: string) => {
    let content = await readFile(url);
    const hasApply = content.includes("@apply ");
    if (hasApply) {
      content = content.replace(applyRE, (substring, utils: string) => {
        let output = "";
        for (const token of utils.split(" ")) {
          if (!token) continue;
          const match = tokenParser(token);
          if (match === undefined) {
            throw RDSError({
              message: `No rules matching "${token}"`,
              file: url,
              frame: codeToFrame(substring, null),
            });
          }
          const meta = getRuleMeta(match.ruleEntry.rule);
          if (
            match.screen || // TODO: Find a way to make it working
            match.variants.length || // TODO: Use nesting if not media query
            meta?.selectorRewrite || // TODO: Use nesting
            meta?.addDefault || // TODO: Maybe it works if added in main
            meta?.addKeyframes || // TODO: Maybe it works if added in main
            meta?.addContainer
          ) {
            throw RDSError({
              message: `Complex utils like "${token}" are not supported. You can use @screen for media variants.`,
              file: url,
              frame: codeToFrame(substring, null),
            });
          }
          for (const cssEntry of toCSSEntries(match.ruleEntry)) {
            output += `${cssEntry[0]}:${cssEntry[1]};`;
          }
        }
        return `${substring[0]}${output.slice(0, -1)}${substring.at(-1)!}`;
      });
    }

    const hasScreen = content.includes("@screen ");
    if (hasScreen) {
      content = content.replace(screenRE, (substring, rawValue: string) => {
        const value = rawValue.trim();
        const variant = variantsMap.get(value);
        if (variant === undefined) {
          throw RDSError({
            message: `No variant matching "${value}"`,
            file: url,
            frame: codeToFrame(substring, null),
          });
        }
        if (!variant.media) {
          throw RDSError({
            message: `"${value}" is not a screen variant`,
            file: url,
            frame: codeToFrame(substring, null),
          });
        }
        return `@media ${variant.media} {`;
      });
    }

    return content;
  };
