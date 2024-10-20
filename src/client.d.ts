// CSS modules
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// CSS
declare module "*.css" {}

// JSON URL
declare module "*.json?url" {
  const src: string;
  export default src;
}

// SVG
declare module "*.svg" {
  import type { FunctionComponent, SVGProps } from "react";
  const ReactComponent: FunctionComponent<
    SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}
declare module "*.svg?url" {
  const src: string;
  export default src;
}
declare module "*.svg?inline" {
  const data: string;
  export default data;
}

// Assets
