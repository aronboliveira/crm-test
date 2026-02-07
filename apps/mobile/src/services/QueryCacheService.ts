import StorageService from "./StorageService";

type CacheEnvelope<T> = Readonly<{
  v: T;
  ts: number;
  exp: number;
}>;

type StoreKind = "session" | "local";

/**
 * RN note:
 * - If StorageService.session is in-memory only: perfect for query cache.
 * - If StorageService.session uses AsyncStorage: make these methods async.
 *
 * Below assumes StorageService session/local are BOTH async-safe facades.
 */
export default class QueryCacheService {
  static #PFX = "cache.";

  // Choose where to store cache. For "session cache", use session.
  static #storeKind: StoreKind = "session";

  static setStoreKind(kind: StoreKind): void {
    QueryCacheService.#storeKind = kind === "local" ? "local" : "session";
  }

  static async get<T>(key: string): Promise<T | null> {
    const k = QueryCacheService.#PFX + String(key || "").trim();
    if (!k || k === QueryCacheService.#PFX) return null;

    const store =
      QueryCacheService.#storeKind === "local"
        ? StorageService.local
        : StorageService.session;

    const env = await store.getJson<CacheEnvelope<T> | null>(k, null);
    if (!env) return null;

    const now = Date.now();
    if (now <= env.exp) return env.v;

    await store.del(k);
    return null;
  }

  static async set<T>(key: string, v: T, ttlMs: number): Promise<void> {
    const k = QueryCacheService.#PFX + String(key || "").trim();
    if (!k || k === QueryCacheService.#PFX) return;

    const store =
      QueryCacheService.#storeKind === "local"
        ? StorageService.local
        : StorageService.session;

    const now = Date.now();
    const env: CacheEnvelope<T> = {
      v,
      ts: now,
      exp: now + Math.max(2_000, ttlMs),
    };

    await store.setJson(k, env);
  }

  static async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const hit = await QueryCacheService.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;

    const v = await fetcher();
    await QueryCacheService.set(key, v, ttlMs);
    return v;
  }

  static async drop(key: string): Promise<void> {
    const k = QueryCacheService.#PFX + String(key || "").trim();
    if (!k || k === QueryCacheService.#PFX) return;

    const store =
      QueryCacheService.#storeKind === "local"
        ? StorageService.local
        : StorageService.session;

    await store.del(k);
  }
}
