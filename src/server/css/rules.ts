import { ResolvedCSSConfig, Rule } from "./types";

export const getRules = ({ theme }: ResolvedCSSConfig): Rule[] => [
  [
    /^text-(.+)$/,
    ([v]) => !!theme.colors[v!],
    ([v]) => ({ color: theme.colors[v!] }),
  ],
  [
    /^p([trbl])?-(.+)$/,
    ([, v]) => !!theme.spacing[v!],
    ([d, v]) => ({ [`padding${getDirection(d)}`]: theme.spacing[v!] }),
  ],
  [
    /^m([trbl])?-(.+)$/,
    ([, v]) => !!theme.spacing[v!],
    ([d, v]) => ({ [`margin${getDirection(d)}`]: theme.spacing[v!] }),
  ],
];

const getDirection = (d: string | undefined) => {
  if (!d) return "";
  return { t: "-top", r: "-right", b: "-bottom", l: "-left" }[d];
};
