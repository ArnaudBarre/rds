import { cache } from "./cache.ts";
import { readFile } from "./utils.ts";

export const jsonCache = cache(
  "json",
  (url) => `export default ${readFile(url)}`,
);
