import { cache } from "../utils";
import { CSSPreTransform } from "./cssPreTransform";
import { parcel } from "./parcel";

export type CSSTransform = ReturnType<typeof getCSSTransform>;

export const getCSSTransform = (preTransform: CSSPreTransform) =>
  cache("css", async (url) =>
    parcel({
      url,
      code: await preTransform(url),
      analyzeDependencies: true,
      nesting: true,
    }),
  );
