import fs from "fs";
import crypto from "crypto";
import { join } from "path";

export const getHash = (content: string) =>
  `${crypto.createHash("sha1").update(content, "utf-8").digest("hex")}`;

export const getHashedUrl = (base: string, content: string) =>
  `${base}?h=${getHash(content)}`;

export const readFile = (path: string) => fs.promises.readFile(path, "utf-8");

export const cacheDir = join(process.cwd(), "node_modules/.rds");
export const readCacheFile = (path: string) => readFile(join(cacheDir, path));

export const isDebug = process.argv.includes("--debug");

export const cache = <Key, Value>(name: string, load: (key: Key) => Value) => {
  const cache = new Map<Key, Value>();
  return {
    has: cache.has.bind(cache),
    delete: (key: Key) => {
      if (isDebug) console.log(`${name}: delete - ${key}`);
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
