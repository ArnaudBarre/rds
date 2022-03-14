import { readFileSync, promises as fs, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { dirname, extname, join } from "path";

import { isDebug, logger } from "./logger";

export const isCSS = (path: string) => path.endsWith(".css");
export const isJS = (path: string) => /\.[jt]sx?$/.test(path);
export const isSVG = (path: string) => path.endsWith(".svg");
export const isInnerNode = (path: string) => isJS(path) || isCSS(path);

export const getExtension = (path: string) => extname(path).slice(1);

export const getHash = (content: string | Buffer) =>
  createHash("sha1")
    .update(
      // @ts-ignore
      content,
      typeof content === "string" ? "utf-8" : undefined,
    )
    .digest("hex")
    .slice(0, 8);

export const getHashedUrl = (base: string, content: string | Buffer) =>
  `/${base}?h=${getHash(content)}`;

export const impSourceToRegex = (source: string) =>
  `\\s+['"]${escapeRegExp(source)}['"]`;

const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const readFile = (path: string) => fs.readFile(path, "utf-8");
export const readMaybeFileSync = (path: string) => {
  try {
    return readFileSync(path, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") return;
    throw err;
  }
};
export const jsonCacheSync = <T extends Record<string, any>>(
  name: string,
  version: number,
) => {
  const path = join(cacheDir, `${name}.json`);
  return {
    read: (): T | undefined => {
      const content = readMaybeFileSync(path);
      if (!content) {
        logger.debug(`${name} cache not found`);
        return;
      }
      const json = JSON.parse(content) as T & { version: number };
      if (json.version !== version) {
        logger.info(`Skipping ${name} cache (version change)`);
        return;
      }
      return json;
    },
    write: (data: T) =>
      writeFileSync(path, JSON.stringify({ version, ...data })),
  };
};

export const cacheDir = "node_modules/.rds";
export const readCacheFile = (path: string) => readFile(join(cacheDir, path));

export const cache = <Value>(name: string, load: (key: string) => Value) => {
  const map = new Map<string, Value>();
  return {
    has: (key: string) => {
      logger.debug(`${name}: has - ${key}`);
      return map.has(key);
    },
    delete: (key: string) => {
      logger.debug(`${name}: delete - ${key}`);
      map.delete(key);
    },
    clear: () => {
      logger.debug(`${name}: clear`);
      map.clear();
    },
    get: (key: string) => {
      logger.debug(`${name}: get - ${key}`);
      const cached = map.get(key);
      if (cached) return cached;
      const start = isDebug ? performance.now() : 0;
      const value = load(key);
      if (isDebug) {
        (async () => {
          // eslint-disable-next-line @typescript-eslint/await-thenable
          await value;
          logger.debug(
            `${name}: load - ${key}: ${Math.round(
              performance.now() - start,
            )}ms`,
          );
        })();
      }
      map.set(key, value);
      return value;
    },
  };
};

export const run = <T>(cb: () => T) => cb();

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
