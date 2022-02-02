import crypto from "crypto";
import fs from "fs";

export const getHash = (content: string) =>
  `${crypto.createHash("sha1").update(content, "utf-8").digest("hex")}`;

export const readFile = (path: string) => fs.promises.readFile(path, "utf-8");

export const cache = <Key, Value>(load: (key: Key) => Value) => {
  const cache = new Map<Key, Value>();
  return {
    has: cache.has,
    delete: cache.delete,
    get: (key: Key) => {
      const cached = cache.get(key);
      if (cached) return cached;
      const value = load(key);
      cache.set(key, value);
      return value;
    },
  };
};
