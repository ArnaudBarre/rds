import { RDS_CSS_UTILS } from "../consts";
import { cache, getHashedUrl, notNull, readFile } from "../utils";

import { ws } from "../ws";
import { log } from "../logger";
import { colors } from "../colors";
import { rules } from "./rules";
import { getRuleIndexMatch, getRuleMeta, matchToCSSObject } from "./matcher";
import { Keyframes } from "./types";
import { cssDefaults, CSSDefault } from "./defaults";
import { cssConfig } from "./cssConfig";

let ready = false;
const blockList = new Set<string>();
const contentMap = new Map<string, Set<string>>();
const allMatches: RuleMatch[] = [];
const allClasses = new Set<string>();

const scanContentCache = cache("scanContent", async (url: string) => {
  const code = await readFile(url);
  if (!(url.endsWith("x") || code.includes("@css-scan"))) return;
  const matches = scanCode(code);
  const actual = contentMap.get(url);
  if (
    actual &&
    actual.size >= matches.length &&
    matches.every((m) => actual.has(m[1]))
  ) {
    return;
  }
  contentMap.set(url, new Set(matches.map((m) => m[1])));
  let hasNew = true;
  for (const match of matches) {
    if (allClasses.has(match[1])) continue;
    allClasses.add(match[1]);
    allMatches.push(match);
    hasNew = true;
  }
  if (!ready || !hasNew) return;
  generatorCache.delete(null);
  log.info(colors.green("hmr update ") + colors.dim(RDS_CSS_UTILS));
  ws.send({ type: "update", paths: [getHashedCSSUtilsUrl()] });
});

const generatorCache = cache("generator", (_: null) => {
  const keyframes: [string, Keyframes][] = [];
  const defaults: CSSDefault[] = [];
  const utils = allMatches
    .map((match) => {
      const meta = getRuleMeta(rules[match[0]]);
      const rewrite = meta?.selectorRewrite ?? ((v) => v);
      if (meta?.addDefault) defaults.push(meta.addDefault);
      if (meta?.addKeyframes) {
        const animationProperty =
          cssConfig.theme.animation[match[1].slice("animate-".length)];
        const name = animationProperty.slice(0, animationProperty.indexOf(" "));
        console.error(name);
        if (cssConfig.theme.keyframes[name]) {
          keyframes.push([name, cssConfig.theme.keyframes[name]]);
        }
      }
      return printBlock(
        `.${escapeSelector(rewrite(match[1]))}`,
        matchToCSSObject(match),
      );
    })
    .join("\n");
  return [
    defaults.length
      ? printBlock(
          "*",
          defaults.reduce<Record<string, string>>(
            (acc, v) => ({ ...acc, ...cssDefaults[v] }),
            {},
          ),
        )
      : null,
    ...keyframes.map(
      ([name, points]) =>
        `@keyframes ${name} {\n${Object.entries(points)
          .map(([key, value]) => printBlock(key, value, 2))
          .join("\n")}\n}`,
    ),
    utils,
  ]
    .filter(notNull)
    .join("\n\n");
});
const generate = () => generatorCache.get(null);
const getHashedCSSUtilsUrl = () => getHashedUrl(RDS_CSS_UTILS, generate());

export const cssGenerator = {
  scanContentCache,
  enableUpdates: () => (ready = true),
  generate,
  getHashedCSSUtilsUrl,
};

const validSelectorRe = /^[a-z0-9:/\[\]-]+$/;
type RuleMatch = [ruleIndex: number, input: string];
const scanCode = (code: string): RuleMatch[] => {
  const matches: RuleMatch[] = [];
  const tokens = code
    .split(/[\s'"`;>=]+/g)
    .filter((t) => validSelectorRe.test(t) && !blockList.has(t));
  const localMatches = new Set<string>();
  for (const token of tokens) {
    if (localMatches.has(token) || blockList.has(token)) continue;
    const ruleIndex = getRuleIndexMatch(token);
    if (ruleIndex === undefined) {
      blockList.add(token);
    } else {
      matches.push([ruleIndex, token]);
      localMatches.add(token);
    }
  }
  return matches;
};

const escapeSelector = (selector: string) =>
  selector.replace(/[:/\[\]]/g, (c) => `\\${c}`);

const printBlock = (
  selector: string,
  values: Record<string, string>,
  indent = 0,
) =>
  `${" ".repeat(indent)}${selector} {\n${Object.entries(values)
    .map(([key, value]) => `${" ".repeat(indent + 2)}${key}: ${value};`)
    .join("\n")}\n${" ".repeat(indent)}}`;
