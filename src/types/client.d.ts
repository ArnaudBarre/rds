// Virtual entrypoint for on-demand CSS utils
declare module "virtual:@rds/css-utils";
// Virtual entrypoint for CSS reset
declare module "virtual:@rds/css-reset";

// CSS modules
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// SVG
declare module "*.svg" {
  import { FunctionComponent, SVGProps } from "react";
  const ReactComponent: FunctionComponent<
    SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}
declare module "*.svg?inline" {
  // TODO
  const data: string;
  export default data;
}

// Images
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.avif" {
  const src: string;
  export default src;
}

// Media
declare module "*.mp3" {
  const src: string;
  export default src;
}
declare module "*.aac" {
  const src: string;
  export default src;
}
declare module "*.wav" {
  const src: string;
  export default src;
}
declare module "*.mp4" {
  const src: string;
  export default src;
}
declare module "*.webm" {
  const src: string;
  export default src;
}

// Fonts
declare module "*.woff" {
  const src: string;
  export default src;
}
declare module "*.woff2" {
  const src: string;
  export default src;
}
declare module "*.ttf" {
  const src: string;
  export default src;
}
declare module "*.otf" {
  const src: string;
  export default src;
}

// Others
declare module "*.txt" {
  const src: string;
  export default src;
}
declare module "*.pdf" {
  const src: string;
  export default src;
}
