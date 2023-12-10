import { dirname, join } from "node:path";

export const resolve = (from: string, importString: string) =>
  join(dirname(from), stripQuery(importString));

const stripQuery = (url: string) => {
  const index = url.indexOf("?");
  return index > -1 ? url.slice(0, index) : url;
};
