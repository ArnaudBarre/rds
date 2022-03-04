import { RDS_CSS_UTILS } from "../consts";
import { cache, getHashedUrl, notNull, readFile } from "../utils";

import { ws } from "../ws";
import { log } from "../logger";
import { colors } from "../colors";
import { getRuleMeta, RuleEntry, rules } from "./rules";
import { getRuleEntry, ruleEntryToCSSEntries } from "./matcher";
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
  const utils = allMatches
    .map((match) => {
      const ruleEntry = match[1];
      const meta = getRuleMeta(rules[ruleEntry[0]]);
      const rewrite = meta?.selectorRewrite ?? ((v) => v);
      if (meta?.addContainer) addContainer = true;
      if (meta?.addDefault) defaults.add(meta.addDefault);
      if (meta?.addKeyframes) {
        const animationProperty = cssConfig.theme.animation[ruleEntry[1]];
        const name = animationProperty.slice(0, animationProperty.indexOf(" "));
        if (cssConfig.theme.keyframes[name]) keyframes.add(name);
      }
      return printBlock(
        `.${escapeSelector(rewrite(match[0]))}`,
        ruleEntryToCSSEntries(ruleEntry),
      );
    })
    .join("\n");
  return [
    defaults.size
      ? printBlock(
          "*, ::before, ::after",
          [...defaults].flatMap((d) => cssDefaults[d]),
        )
      : null,
    ...[...keyframes].map(
      (name) => `@keyframes ${name} {\n  ${cssConfig.theme.keyframes[name]}\n}`,
    ),
    addContainer ? printContainer() : null,
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
const scanCode = (code: string) => {
  const matches: RuleMatch[] = [];
  const tokens = code
    .split(/[\s'"`;>=]+/g)
    .filter((t) => validSelectorRe.test(t) && !blockList.has(t));
  const localMatches = new Set<string>();
  for (const token of tokens) {
    if (localMatches.has(token) || blockList.has(token)) continue;
    const ruleEntry = getRuleEntry(token);
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
  return [
    `.container { width: 100%; ${
      cssConfig.theme.container.center
        ? `padding-right: auto; padding-left: auto; `
        : ""
    }${getPadding(defaultPadding)}}`,
    ...Object.entries(cssConfig.theme.screens).map(([name, { min }]) => {
      if (!min) return "";
      return `@media (min-width: ${min}) {
  .container { max-width: ${min}; ${getPadding(
        typeof paddingConfig === "string" ? undefined : paddingConfig?.[name],
      )}}\n}`;
    }),
  ].join("\n");
};

const printBlock = (selector: string, entries: CSSEntries) =>
  `${selector} {\n${entries
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n")}\n}`;
