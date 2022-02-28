import { RDS_CSS_UTILS } from "../consts";
import { cache, getHashedUrl, readFile } from "../utils";

import { ws } from "../ws";
import { log } from "../logger";
import { colors } from "../colors";
import { getRuleIndexMatch, matchToCSSObject, rules } from "./matcher";
import { SelectorRewrite } from "./types";

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
  return allMatches
    .map((match) => {
      const rewrite: SelectorRewrite = rules[match[0]][3] ?? ((v) => v);
      return `.${escapeSelector(rewrite(match[1]))} {\n${Object.entries(
        matchToCSSObject(match),
      )
        .map(([key, value]) => `  ${key}: ${value};`)
        .join("\n")}\n}`;
    })
    .join("\n");
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
    if (localMatches.has(token)) continue;
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
