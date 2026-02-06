type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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
      if (!k || typeof k !== "string") {
        console.warn("[StorageFacade] Invalid key provided to getJson");
        return fallback;
      }
      const raw = this.#s.getItem(this.key(k));
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[StorageFacade] Failed to get JSON for key "${k}":`, error);
      return fallback;
    }
  }

  setJson<T>(k: string, v: T): void {
    try {
      if (!k || typeof k !== "string") {
        console.warn("[StorageFacade] Invalid key provided to setJson");
        return;
      }
      this.#s.setItem(this.key(k), JSON.stringify(v));
    } catch (error) {
      console.warn(`[StorageFacade] Failed to set JSON for key "${k}":`, error);
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
      if (!k || typeof k !== "string") {
        console.warn("[StorageFacade] Invalid key provided to del");
        return;
      }
      this.#s.removeItem(this.key(k));
    } catch (error) {
      console.warn(`[StorageFacade] Failed to delete key "${k}":`, error);
    }
  }
}

export default class StorageService {
  static local = new StorageFacade(window.localStorage, "corp.admin.");
  static session = new StorageFacade(window.sessionStorage, "corp.admin.");
}
