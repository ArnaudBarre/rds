import { debugNow, logger } from "./logger";

export const cache = <Value>(name: string, load: (key: string) => Value) => {
  const map = new Map<string, Value>();
  const loadAndSave = (key: string) => {
    const start = debugNow();
    const value = load(key);
    logger.debug(`${name}: load - ${key}: ${Math.round(debugNow() - start)}ms`);
    map.set(key, value);
    return value;
  };

  return {
    has: (key: string) => {
      logger.debug(`${name}: has - ${key}`);
      return map.has(key);
    },
    delete: (key: string) => {
      logger.debug(`${name}: delete - ${key}`);
      map.delete(key);
    },
    reload: (hasChanged: (previous: Value, next: Value) => boolean) => {
      logger.debug(`${name}: reload`);
      const changedKeys: string[] = [];
      for (const [key, previous] of map.entries()) {
        const next = loadAndSave(key);
        if (hasChanged(previous, next)) changedKeys.push(key);
      }
      return changedKeys;
    },
    clear: () => {
      logger.debug(`${name}: clear`);
      map.clear();
    },
    get: (key: string) => {
      logger.debug(`${name}: get - ${key}`);
      const cached = map.get(key);
      if (cached) return cached;
      return loadAndSave(key);
    },
  };
};
