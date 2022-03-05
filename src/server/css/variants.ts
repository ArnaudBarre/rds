import { log } from "../logger";
import { cssConfig } from "./cssConfig";
import { SelectorRewrite } from "./types";

const start = performance.now();

export type Variant =
  | { selectorRewrite: SelectorRewrite; media?: never }
  | { selectorRewrite?: never; media: string; screen?: string };

export const variantsMap = new Map<string, Variant>();

for (let screen in cssConfig.theme.screens) {
  const values = cssConfig.theme.screens[screen];
  if (values.min) {
    if (values.max) {
      variantsMap.set(screen, {
        media: `(min-width: ${values.min} and max-width: ${values.max})`,
        screen,
      });
    } else {
      variantsMap.set(screen, { media: `(min-width: ${values.min})`, screen });
    }
  } else {
    variantsMap.set(screen, { media: `(max-width: ${values.max})`, screen });
  }
}

variantsMap.set("dark", {
  selectorRewrite: (v) => `dark .${v}`,
});

[
  "first-letter",
  "first-line",
  "marker",
  "selection",
  ["file", "file-selector-button"],
  "placeholder",
  "before",
  "after",
].forEach((value) => {
  const [prefix, suffix] = Array.isArray(value) ? value : [value, value];
  variantsMap.set(prefix, {
    selectorRewrite: (value) => `${value}::${suffix}`,
  });
});

[
  // Positional
  ["first", ":first-child"],
  ["last", ":last-child"],
  ["only", ":only-child"],
  ["odd", ":nth-child(odd)"],
  ["even", ":nth-child(even)"],
  "first-of-type",
  "last-of-type",
  "only-of-type",

  // State
  "visited",
  "target",
  ["open", "[open]"],

  // Forms
  "default",
  "checked",
  "indeterminate",
  "placeholder-shown",
  "autofill",
  "required",
  "valid",
  "invalid",
  "in-range",
  "out-of-range",
  "read-only",

  // Content
  "empty",

  // Interactive
  "focus-within",
  "hover",
  "focus",
  "focus-visible",
  "active",
  "disabled",
].forEach((value) => {
  const [prefix, suffix] = Array.isArray(value) ? value : [value, `:${value}`];

  variantsMap.set(prefix, {
    selectorRewrite: (value) => `${value}${suffix}`,
  });
  variantsMap.set(`group-${prefix}`, {
    selectorRewrite: (value) => `group${suffix} .${value}`,
  });
  variantsMap.set(`peer-${prefix}`, {
    selectorRewrite: (value) => `peer${suffix} ~ .${value}`,
  });
});

[
  ["motion-safe", "(prefers-reduced-motion: no-preference)"],
  ["motion-reduce", "(prefers-reduced-motion: reduce)"],
  ["print", "print"],
  ["portrait", "(orientation: portrait)"],
  ["landscape", "(orientation: landscape)"],
].forEach(([prefix, media]) => {
  variantsMap.set(prefix, { media });
});

log.debug(
  `${variantsMap.size} variants added in ${(performance.now() - start).toFixed(
    2,
  )}ms`,
);
