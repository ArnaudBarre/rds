import { RDS_CSS_UTILS } from "../consts";
import { cache, getHashedUrl, readFile } from "../utils";

import { ws } from "../ws";
import { log } from "../logger";
import { colors } from "../colors";
import { getRuleMeta, RuleEntry, rules } from "./rules";
import { matchToken, ruleEntryToCSSEntries } from "./matcher";
import { CSSDefault, cssDefaults } from "./defaults";
import { cssConfig } from "./cssConfig";
import { CSSEntries } from "./types";

let ready = false;
const blockList = new Set<string>();
const contentMap = new Map<string, Set<string>>();
type RuleMatch = [string, RuleEntry];
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
    matches.every((m) => actual.has(m[0]))
  ) {
    return;
  }
  contentMap.set(url, new Set(matches.map((m) => m[0])));
  let hasNew = true;
  for (const match of matches) {
    if (allClasses.has(match[0])) continue;
    allClasses.add(match[0]);
    allMatches.push(match);
    hasNew = true;
  }
  if (!ready || !hasNew) return;
  generatorCache.delete(null);
  log.info(colors.green("hmr update ") + colors.dim(RDS_CSS_UTILS));
  ws.send({ type: "update", paths: [getHashedCSSUtilsUrl()] });
});

const generatorCache = cache("generator", (_: null) => {
  let addContainer = false;
  const keyframes = new Set<string>();
  const defaults = new Set<CSSDefault>();
  let output = "";
  let utilsOutput = "";
  for (const match of allMatches.sort((a, b) => a[1][4] - b[1][4])) {
    const ruleEntry = match[1];
    const meta = getRuleMeta(rules[ruleEntry[0]]);
    const rewrite = meta?.selectorRewrite ?? ((v) => v);
    if (meta?.addContainer) {
      addContainer = true;
      continue;
    }
    if (meta?.addDefault) defaults.add(meta.addDefault);
    if (meta?.addKeyframes) {
      const animationProperty = cssConfig.theme.animation[ruleEntry[1]];
      const name = animationProperty.slice(0, animationProperty.indexOf(" "));
      if (cssConfig.theme.keyframes[name]) keyframes.add(name);
    }
    utilsOutput += printBlock(
      `.${escapeSelector(rewrite(match[0]))}`,
      ruleEntryToCSSEntries(ruleEntry),
    );
  }

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
const getHashedCSSUtilsUrl = () => getHashedUrl(RDS_CSS_UTILS, generate());

export const cssGenerator = {
  scanContentCache,
  enableUpdates: () => (ready = true),
  generate,
  getHashedCSSUtilsUrl,
};

const validSelectorRe = /^[a-z0-9:/\[\]#-]+$/;
const scanCode = (code: string) => {
  const matches: RuleMatch[] = [];
  const tokens = code
    .split(/[\s'"`;>=]+/g)
    .filter((t) => validSelectorRe.test(t) && !blockList.has(t));
  const localMatches = new Set<string>();
  for (const token of tokens) {
    if (localMatches.has(token) || blockList.has(token)) continue;
    const ruleEntry = matchToken(token);
    if (ruleEntry === undefined) {
      blockList.add(token);
    } else {
      matches.push([token, ruleEntry]);
      localMatches.add(token);
    }
  }
  return matches;
};

const escapeSelector = (selector: string) =>
  selector.replace(/[:/\[\]]/g, (c) => `\\${c}`);

const printContainer = (): string => {
  const paddingConfig = cssConfig.theme.container.padding;
  const defaultPadding =
    typeof paddingConfig === "string" ? paddingConfig : paddingConfig?.DEFAULT;
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

const printBlock = (selector: string, entries: CSSEntries) => {
  selector += ` {\n`;
  for (let entry of entries) {
    selector += `  ${entry[0]}: ${entry[1]};\n`;
  }
  selector += `}\n`;
  return selector;
};
