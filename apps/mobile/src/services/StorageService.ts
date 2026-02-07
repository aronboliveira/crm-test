import type { MMKV } from "react-native-mmkv";

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
};

class MMKVStore implements Store {
  #kv: MMKV;

  constructor(kv: MMKV) {
    this.#kv = kv;
  }

  getItem(key: string): string | null {
    const v = this.#kv.getString(key);
    return typeof v === "string" ? v : null;
  }

  setItem(key: string, value: string): void {
    this.#kv.set(key, value);
  }

  removeItem(key: string): void {
    this.#kv.delete(key);
  }

  clear(): void {
    this.#kv.clearAll();
  }
}

class StorageFacade {
  #s: Store;
  #p: string;

  constructor(s: Store, prefix: string) {
    this.#s = s;
    this.#p = prefix;
  }

  key(k: string): string {
    return `${this.#p}${k}`;
  }

  getJson<T>(k: string, fallback: T): T {
    try {
      if (!k || typeof k !== "string") return fallback;
      const raw = this.#s.getItem(this.key(k));
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setJson<T>(k: string, v: T): void {
    try {
      if (!k || typeof k !== "string") return;
      this.#s.setItem(this.key(k), JSON.stringify(v));
    } catch {
      // non-fatal
    }
  }

  getBool(k: string, fallback: boolean): boolean {
    const v = this.getJson<{ v: 0 | 1 }>(k, { v: fallback ? 1 : 0 });
    return v.v === 1;
  }

  setBool(k: string, v: boolean): void {
    this.setJson(k, { v: v ? 1 : 0 });
  }

  getStr(k: string, fallback: string): string {
    const v = this.getJson<{ v: string }>(k, { v: fallback });
    return typeof v.v === "string" ? v.v : fallback;
  }

  setStr(k: string, v: string): void {
    this.setJson(k, { v });
  }

  del(k: string): void {
    try {
      if (!k || typeof k !== "string") return;
      this.#s.removeItem(this.key(k));
    } catch {
      // non-fatal
    }
  }

  clear(): void {
    this.#s.clear?.();
  }
}

// Separate stores (RN doesn’t have “sessionStorage”; this is just a second namespace).
const localKV = new MMKV({ id: "corp.admin.local" });
const sessionKV = new MMKV({ id: "corp.admin.session" });

export default class StorageService {
  static local = new StorageFacade(new MMKVStore(localKV), "corp.admin.");
  static session = new StorageFacade(new MMKVStore(sessionKV), "corp.admin.");

  /**
   * Optional: if you want “session-like” semantics,
   * call StorageService.session.clear() on app start.
   */
}
