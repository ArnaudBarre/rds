import { ResolvedCSSConfig, Rule } from "../types";
import { enumRule } from "./utils";

export const getInteractivity = (_: ResolvedCSSConfig): Rule[] => [
  // https://tailwindcss.com/docs/appearance
  ["appearance-none", { "appearance-none": "none" }],

  // https://tailwindcss.com/docs/cursor
  enumRule("cursor-", "cursor", [
    "auto",
    "default",
    "pointer",
    "wait",
    "text",
    "move",
    "help",
    "not-allowed",
    "none",
    "context-menu",
    "progress",
    "cell",
    "crosshair",
    "vertical-text",
    "alias",
    "copy",
    "no-drop",
    "grab",
    "grabbing",
    "all-scroll",
    "col-resize",
    "row-resize",
    "n-resize",
    "e-resize",
    "s-resize",
    "w-resize",
    "ne-resize",
    "nw-resize",
    "se-resize",
    "sw-resize",
    "ew-resize",
    "ns-resize",
    "nesw-resize",
    "nwse-resize",
    "zoom-in",
    "zoom-out",
  ]),

  // https://tailwindcss.com/docs/pointer-events
  ["pointer-events-auto", { "pointer-events": "auto" }],
  ["pointer-events-none", { "pointer-events": "none" }],

  // https://tailwindcss.com/docs/resize
  ["resize-x", { resize: "horizontal" }],
  ["resize-y", { resize: "vertical" }],
  ["resize", { resize: "both" }],
  ["resize-none", { resize: "none" }],

  // https://tailwindcss.com/docs/user-select
  enumRule("select-", "user-select", ["auto", "all", "text", "none"]),
];
