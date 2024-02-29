import { existsSync, promises, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getHash } from "@arnaud-barre/config-loader";

export const isCSS = (path: string) => path.endsWith(".css");
export const isJS = (path: string) => /\.[jt]sx?$/.test(path);
export const isWorker = (path: string) => path.endsWith("?worker");
export const isSVG = (path: string) => path.endsWith(".svg");
export const isJSON = (path: string) => path.endsWith(".json");
export const isInnerNode = (path: string) => isJS(path) || isCSS(path);

export const getExtension = (path: string) => extname(path).slice(1);

export const getHashedUrl = (base: string, content: string | Buffer) =>
  `/${base}?h=${getHash(content).slice(0, 8)}`;

export const readFile = (path: string) => readFileSync(path, "utf-8");
export const readFileAsync = (path: string) => promises.readFile(path, "utf-8");

export const cacheDir = "node_modules/.rds";
export const readCacheFile = (path: string) => readFile(join(cacheDir, path));

export const getPathFromServerOutput = (path: string) =>
  join(dirname(fileURLToPath(import.meta.url)), path);

export const run = <T>(cb: () => T) => cb();

export const safeCast = <T>(value: T) => value;

export const split = <T>(array: T[], predicate: (value: T) => boolean) => {
  const positive: T[] = [];
  const negative: T[] = [];
  for (const el of array) (predicate(el) ? positive : negative).push(el);
  return [positive, negative];
};

export const lookup = (formats: string[], dir = "."): string | undefined => {
  for (const format of formats) {
    const fullPath = join(dir, format);
    if (existsSync(fullPath)) return fullPath;
  }
  const parentDir = dirname(dir);
  if (parentDir !== dir) return lookup(formats, parentDir);
};

export const notNull = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const mapObject = <K extends string, V, K2 extends string, V2>(
  object: Record<K, V>,
  fn: (t: [k: K, v: V]) => [K2, V2],
) =>
  Object.fromEntries(
    Object.entries(object).map(([key, v]) => fn([key as K, v as V])),
  ) as Record<K2, V2>;

export const mapObjectValue = <K extends string, V, R>(
  object: Record<K, V>,
  fn: (v: V) => R,
) => {
  const result = {} as Record<K, R>;
  for (const key in object) {
    result[key] = fn(object[key]);
  }
  return result;
};
