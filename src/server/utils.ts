import fs from "fs";
import crypto from "crypto";
import { dirname, join } from "path";

import { log } from "./logger";

export const getHash = (content: string) =>
  `${crypto.createHash("sha1").update(content, "utf-8").digest("hex")}`;

export const getHashedUrl = (base: string, content: string) =>
  `${base}?h=${getHash(content)}`;

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
    has: cache.has.bind(cache),
    delete: (key: Key) => {
      log.debug(`${name}: delete - ${key}`);
      cache.delete(key);
    },
    get: (key: Key) => {
      const cached = cache.get(key);
      if (cached) return cached;
      const value = load(key);
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
