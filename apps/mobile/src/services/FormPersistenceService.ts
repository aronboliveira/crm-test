import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Web version had both sessionStorage and localStorage paths.
 * RN has no sessionStorage. We emulate:
 * - "session": in-memory only (lost on app restart)
 * - "local": AsyncStorage (persisted)
 */

type FormMap = Record<string, Record<string, string>>;

class MemoryStore {
  private map = new Map<string, string>();
  async getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  async setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  async removeItem(k: string) {
    this.map.delete(k);
  }
}

const sessionStore = new MemoryStore();

type StoreKind = "session" | "local";

const storeOf = (kind: StoreKind) =>
  kind === "local" ? AsyncStorage : sessionStore;

export default class FormPersistenceService {
  static #K = "ui.forms";

  /**
   * Equivalent of the old sessionStorage-backed read().
   * RN: defaults to "session" store unless you pass kind.
   */
  static async read<T extends Record<string, any>>(
    formId: string,
    fallback: T,
    kind: StoreKind = "session",
  ): Promise<T> {
    const k = String(formId || "").trim();
    if (!k) return fallback;

    try {
      const store = storeOf(kind);
      const raw = await store.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      const v = obj && typeof obj === "object" ? obj[k] : null;

      return v && typeof v === "object"
        ? ({ ...fallback, ...v } as T)
        : fallback;
    } catch {
      return fallback;
    }
  }

  static async write(
    formId: string,
    data: Record<string, any>,
    kind: StoreKind = "session",
  ): Promise<void> {
    const k = String(formId || "").trim();
    if (!k) return;

    try {
      const store = storeOf(kind);
      const raw = await store.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      const next = { ...(obj || {}), [k]: { ...(data || {}) } };
      await store.setItem(FormPersistenceService.#K, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  static async clear(
    formId: string,
    kind: StoreKind = "session",
  ): Promise<void> {
    const k = String(formId || "").trim();
    if (!k) return;

    try {
      const store = storeOf(kind);
      const raw = await store.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      if (obj && typeof obj === "object" && obj[k]) {
        delete obj[k];
        await store.setItem(FormPersistenceService.#K, JSON.stringify(obj));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Old version used StorageService.local; this maps to AsyncStorage in RN.
   * These store string-only maps (useful for "raw field values").
   */
  static async load(formId: string): Promise<Record<string, string>> {
    const k = String(formId || "").trim();
    if (!k) return {};

    try {
      const raw = await AsyncStorage.getItem(FormPersistenceService.#K);
      const all = raw ? (JSON.parse(raw) as FormMap) : {};
      const row = all?.[k];
      return row && typeof row === "object" ? row : {};
    } catch {
      return {};
    }
  }

  static async save(
    formId: string,
    data: Record<string, string>,
  ): Promise<void> {
    const k = String(formId || "").trim();
    if (!k) return;

    try {
      const raw = await AsyncStorage.getItem(FormPersistenceService.#K);
      const all = raw ? (JSON.parse(raw) as FormMap) : {};
      all[k] = data || {};
      await AsyncStorage.setItem(
        FormPersistenceService.#K,
        JSON.stringify(all),
      );
    } catch {
      // ignore
    }
  }

  /**
   * DOM-only in web. RN has no HTMLFormElement.
   * Keep as a no-op if you want shared code to compile.
   */
  static bind(): void {
    // RN: no DOM. Use a hook with controlled inputs instead.
  }

  /** Alias for write() */
  static async persist(
    formId: string,
    data: Record<string, any>,
    kind: StoreKind = "session",
  ): Promise<void> {
    await FormPersistenceService.write(formId, data, kind);
  }

  /** Alias for read() */
  static async restore<T extends Record<string, any>>(
    formId: string,
    fallback: T = {} as T,
    kind: StoreKind = "session",
  ): Promise<T> {
    return await FormPersistenceService.read(formId, fallback, kind);
  }
}
