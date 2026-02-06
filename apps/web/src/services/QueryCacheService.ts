import StorageService from "./StorageService";

type CacheEnvelope<T> = Readonly<{
  v: T;
  ts: number;
  exp: number;
}>;

export default class QueryCacheService {
  static #PFX = "cache.";

  static get<T>(key: string): T | null {
    const env = StorageService.session.getJson<CacheEnvelope<T>>(
      QueryCacheService.#PFX + key,
      null,
    );
    if (!env) return null;

    const now = Date.now();
    return now <= env.exp
      ? env.v
      : (StorageService.session.del(QueryCacheService.#PFX + key), null);
  }

  static set<T>(key: string, v: T, ttlMs: number): void {
    const now = Date.now();
    const env: CacheEnvelope<T> = {
      v,
      ts: now,
      exp: now + Math.max(2_000, ttlMs),
    };
    StorageService.session.setJson(QueryCacheService.#PFX + key, env);
  }

  static async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const hit = QueryCacheService.get<T>(key);
    if (hit) return hit;

    const v = await fetcher();
    QueryCacheService.set(key, v, ttlMs);
    return v;
  }

  static drop(key: string): void {
    StorageService.session.del(QueryCacheService.#PFX + key);
  }
}
