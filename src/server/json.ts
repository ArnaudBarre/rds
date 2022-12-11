import { cache } from "./cache";
import { readFile } from "./utils";

export const jsonCache = cache(
  "json",
  (url) => `export default ${readFile(url)}`,
);
