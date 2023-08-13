import { dirname, join } from "node:path";

export const resolve = (from: string, importString: string) =>
  join(dirname(from), importString);
