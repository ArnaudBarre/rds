// Virtual entrypoint for CSS reset
declare module "virtual:@rds/css-base";
// Virtual entrypoint for on-demand CSS utils
declare module "virtual:@rds/css-utils";

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
declare module "*.svg?url" {
  const src: string;
  export default src;
}
declare module "*.svg?inline" {
  const data: string;
  export default data;
}

// Assets
