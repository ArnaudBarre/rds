import fs from "fs";
import crypto from "crypto";
import { dirname, extname, join } from "path";

import { isDebug, log } from "./logger";

export const isCSS = (path: string) => path.endsWith(".css");
export const isJS = (path: string) => /\.[jt]sx?$/.test(path);
export const isSVG = (path: string) => path.endsWith(".svg");
export const isInnerNode = (path: string) => isJS(path) || isCSS(path);

export const getExtension = (path: string) => extname(path).slice(1);

export const getHash = (content: string | Buffer) =>
  crypto
    .createHash("sha1")
    .update(
      // @ts-ignore
      content,
      typeof content === "string" ? "utf-8" : undefined,
    )
    .digest("hex")
    .slice(0, 8);

export const getHashedUrl = (base: string, content: string | Buffer) =>
  `/${base}?h=${getHash(content)}`;

export const readFile = (path: string) => fs.promises.readFile(path, "utf-8");
export const readFileSync = (path: string) => fs.readFileSync(path, "utf-8");
export const readJSON = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path));
export const readJSONSync = <T>(path: string): T =>
  JSON.parse(readFileSync(path));
export const writeJSON = (path: string, data: unknown) =>
  fs.promises.writeFile(path, JSON.stringify(data));
export const writeJSONSync = (path: string, data: unknown) =>
  fs.writeFileSync(path, JSON.stringify(data));

export const cacheDir = "node_modules/.rds";
export const readCacheFile = (path: string) => readFile(join(cacheDir, path));

export const cache = <Key, Value>(name: string, load: (key: Key) => Value) => {
  const cache = new Map<Key, Value>();
  return {
    has: (key: Key) => {
      log.debug(`${name}: has - ${key}`);
      return cache.has(key);
    },
    delete: (key: Key) => {
      log.debug(`${name}: delete - ${key}`);
      cache.delete(key);
    },
    get: (key: Key) => {
      log.debug(`${name}: get - ${key}`);
      const cached = cache.get(key);
      if (cached) return cached;
      const start = performance.now();
      const value = load(key);
      if (isDebug) {
        (async () => {
          await value;
          log.debug(
            `${name}: load - ${key}: ${Math.round(
              performance.now() - start,
            )}ms`,
          );
        })();
      }
      cache.set(key, value);
      return value;
    },
  };
};

export const split = <T>(array: T[], predicate: (value: T) => boolean) => {
  const positive: T[] = [];
  const negative: T[] = [];
  for (const el of array) (predicate(el) ? positive : negative).push(el);
  return [positive, negative];
};

export const lookup = (formats: string[], dir = "."): string | undefined => {
  for (const format of formats) {
    const fullPath = join(dir, format);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  const parentDir = dirname(dir);
  if (parentDir !== dir) return lookup(formats, parentDir);
};

export const notNull = <T>(value: T | null | undefined): value is T =>
  value != null;
