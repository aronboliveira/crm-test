import SafeJsonService from "./SafeJsonService";

export type StorageKeyValueStore = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const createMemoryStore = (): StorageKeyValueStore => {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
};

const resolveStore = (
  kind: "localStorage" | "sessionStorage",
): StorageKeyValueStore => {
  try {
    if (typeof window !== "undefined" && window?.[kind]) {
      return window[kind];
    }
  } catch {
    void 0;
  }
  return createMemoryStore();
};

export class StorageFacade {
  #store: StorageKeyValueStore;
  #prefix: string;

  constructor(store: StorageKeyValueStore, prefix: string) {
    this.#store = store;
    this.#prefix = String(prefix || "");
  }

  key(key: string): string {
    return `${this.#prefix}${key}`;
  }

  getJson<T>(key: string, fallback: T): T {
    try {
      if (!key || typeof key !== "string") {
        console.warn("[StorageFacade] Invalid key provided to getJson");
        return fallback;
      }
      const raw = this.#store.getItem(this.key(key));
      return SafeJsonService.parse<T>(raw, fallback);
    } catch (error) {
      console.warn(`[StorageFacade] Failed to get JSON for key "${key}":`, error);
      return fallback;
    }
  }

  setJson<T>(key: string, value: T): void {
    try {
      if (!key || typeof key !== "string") {
        console.warn("[StorageFacade] Invalid key provided to setJson");
        return;
      }
      const serialized = SafeJsonService.tryStringify(value);
      if (!serialized) {
        console.warn(`[StorageFacade] Failed to serialize JSON for key "${key}"`);
        return;
      }
      this.#store.setItem(this.key(key), serialized);
    } catch (error) {
      console.warn(`[StorageFacade] Failed to set JSON for key "${key}":`, error);
    }
  }

  getBool(key: string, fallback: boolean): boolean {
    const value = this.getJson<{ v: 0 | 1 }>(key, { v: fallback ? 1 : 0 });
    return value.v === 1;
  }

  setBool(key: string, value: boolean): void {
    this.setJson(key, { v: value ? 1 : 0 });
  }

  getStr(key: string, fallback: string): string {
    const value = this.getJson<{ v: string }>(key, { v: fallback });
    return typeof value.v === "string" ? value.v : fallback;
  }

  setStr(key: string, value: string): void {
    this.setJson(key, { v: value });
  }

  del(key: string): void {
    try {
      if (!key || typeof key !== "string") {
        console.warn("[StorageFacade] Invalid key provided to del");
        return;
      }
      this.#store.removeItem(this.key(key));
    } catch (error) {
      console.warn(`[StorageFacade] Failed to delete key "${key}":`, error);
    }
  }
}

export default class StorageService {
  static local = new StorageFacade(resolveStore("localStorage"), "corp.admin.");
  static session = new StorageFacade(
    resolveStore("sessionStorage"),
    "corp.admin.",
  );

  static createFacade(
    store: StorageKeyValueStore,
    prefix = "corp.admin.",
  ): StorageFacade {
    return new StorageFacade(store, prefix);
  }
}
