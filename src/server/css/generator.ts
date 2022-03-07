import { CSSDefault, CSSEntries } from "../../types";
import { RDS_CSS_UTILS } from "../consts";
import { cache, getHashedUrl, readFile } from "../utils";
import {
  getRuleMeta,
  RuleMatch,
  toCSSEntries,
  TokenParser,
} from "./tokenParser";
import { getCSSDefaults } from "./defaults";
import { ResolvedCSSConfig } from "./cssConfig";
import { VariantsMap } from "./variants";

export type CSSGenerator = ReturnType<typeof getCSSGenerator>;

export const getCSSGenerator = ({
  cssConfig,
  variantsMap,
  tokenParser,
}: {
  cssConfig: ResolvedCSSConfig;
  variantsMap: VariantsMap;
  tokenParser: TokenParser;
}) => {
  const cssDefaults = getCSSDefaults(cssConfig);

  let updateCallback: (() => void) | undefined;
  const blockList = new Set<string>();
  const contentMap = new Map<string, Set<string>>();
  const allMatches = new Map<string, RuleMatch[]>([
    ["", [] as RuleMatch[]],
    ...Object.keys(cssConfig.theme.screens).map(
      (screen): [string, RuleMatch[]] => [screen, []],
    ),
  ]);
  const allClasses = new Set<string>();

  const scanContentCache = cache("scanContent", async (url: string) => {
    const code = await readFile(url);
    if (!(url.endsWith("x") || code.includes("@css-scan"))) return;
    const matches = scanCode(code);
    const actual = contentMap.get(url);
    if (
      actual &&
      actual.size >= matches.length &&
      matches.every((m) => actual.has(m.token))
    ) {
      return;
    }
    contentMap.set(url, new Set(matches.map((m) => m.token)));
    let hasNew = true;
    for (const match of matches) {
      if (allClasses.has(match.token)) continue;
      allClasses.add(match.token);
      allMatches.get(match.screen)!.push(match);
      hasNew = true;
    }
    if (!updateCallback || !hasNew) return;
    generatorCache.delete(null);
    updateCallback();
  });

  const generatorCache = cache("generator", (_: null) => {
    let addContainer = false;
    const keyframes = new Set<string>();
    const defaults = new Set<CSSDefault>();
    let output = "";
    let utilsOutput = "";
    allMatches.forEach((matches, screen) => {
      if (!matches.length) return;
      if (screen)
        utilsOutput += `\n@media ${variantsMap.get(screen)!.media} {\n`;
      for (const match of matches.sort(
        (a, b) => a.ruleEntry.order - b.ruleEntry.order,
      )) {
        const meta = getRuleMeta(match.ruleEntry.rule);
        if (meta?.addContainer) {
          addContainer = true;
          continue;
        }
        if (meta?.addDefault) defaults.add(meta.addDefault);
        if (meta?.addKeyframes) {
          const animationProperty =
            cssConfig.theme.animation[match.ruleEntry.key];
          const name = animationProperty.slice(
            0,
            animationProperty.indexOf(" "),
          );
          if (cssConfig.theme.keyframes[name]) keyframes.add(name);
        }
        let mediaWrapper: string | undefined;
        let selector = escapeSelector(match.token);
        if (meta?.selectorRewrite) selector = meta.selectorRewrite(selector);
        for (let i = match.variants.length - 1; i >= 0; i--) {
          const variant = match.variants[i];
          if (variant.selectorRewrite)
            selector = variant.selectorRewrite(selector);
          else {
            if (mediaWrapper) mediaWrapper += ` and ${variant.media}`;
            else mediaWrapper = variant.media;
          }
        }
        if (mediaWrapper) utilsOutput += `@media ${mediaWrapper} {\n`;
        utilsOutput += printBlock(
          `.${selector}`,
          toCSSEntries(match.ruleEntry),
        );
        if (mediaWrapper) utilsOutput += `}\n`;
      }
      if (screen) utilsOutput += `}\n`;
    });

    if (defaults.size) {
      output += printBlock(
        "*, ::before, ::after",
        [...defaults].flatMap((d) => cssDefaults[d]),
      );
      output += "\n";
    }
    keyframes.forEach((name) => {
      output += `@keyframes ${name} {\n  ${cssConfig.theme.keyframes[name]}\n}\n`;
    });
    if (keyframes.size) output += "\n";
    if (addContainer) output += printContainer();

    return output + utilsOutput;
  });
  const generate = () => generatorCache.get(null);

  const validSelectorRe = /^[a-z0-9:/\[\]#-]+$/;
  const scanCode = (code: string) => {
    const matches: RuleMatch[] = [];
    const tokens = code
      .split(/[\s'"`;>=]+/g)
      .filter((t) => validSelectorRe.test(t) && !blockList.has(t));
    const localMatches = new Set<string>();
    for (const token of tokens) {
      if (localMatches.has(token) || blockList.has(token)) continue;
      const match = tokenParser(token);
      if (match === undefined) {
        blockList.add(token);
      } else {
        matches.push(match);
        localMatches.add(token);
      }
    }
    return matches;
  };

  const printContainer = (): string => {
    const paddingConfig = cssConfig.theme.container.padding;
    const defaultPadding =
      typeof paddingConfig === "string"
        ? paddingConfig
        : paddingConfig?.DEFAULT;
    const getPadding = (value: string | undefined): string => {
      if (!value) return "";
      return `padding-right: ${value}; padding-left: ${value}; `;
    };
    let output = `.container { width: 100%; ${
      cssConfig.theme.container.center
        ? `margin-right: auto; margin-left: auto; `
        : ""
    }${getPadding(defaultPadding)}}\n`;
    for (const name in cssConfig.theme.screens) {
      const { min } = cssConfig.theme.screens[name];
      if (!min) continue;
      output += `@media (min-width: ${min}) {
  .container { max-width: ${min}; ${getPadding(
        typeof paddingConfig === "string" ? undefined : paddingConfig?.[name],
      )}}\n}\n`;
    }
    return output + "\n";
  };

  return {
    scanContentCache,
    onUpdate: (callback: () => void) => (updateCallback = callback),
    generate,
    getHashedCSSUtilsUrl: () => getHashedUrl(RDS_CSS_UTILS, generate()),
  };
};

const escapeSelector = (selector: string) =>
  selector.replace(/[:/\[\]]/g, (c) => `\\${c}`);

const printBlock = (selector: string, entries: CSSEntries) => {
  selector += ` {\n`;
  for (let entry of entries) {
    selector += `  ${entry[0]}: ${entry[1]};\n`;
  }
  selector += `}\n`;
  return selector;
};
