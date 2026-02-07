import AsyncStorage from "@react-native-async-storage/async-storage";

type StorageKind = "session" | "local";
type PersistMap = Record<string, Record<string, any>>;

const KEY = "_forms_persist_v2";

/**
 * RN has no sessionStorage. This implements:
 * - "local": persisted to AsyncStorage (survives app restart)
 * - "session": in-memory only (lost on app restart)
 */
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

const storeOf = (storage: StorageKind) =>
  storage === "local" ? AsyncStorage : sessionStore;

export default class FormFieldPersistenceService {
  static async readAll(storage: StorageKind = "session"): Promise<PersistMap> {
    try {
      const store = storeOf(storage);
      const raw = await store.getItem(KEY);
      const obj = raw ? (JSON.parse(raw) as PersistMap) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  static async writeAll(storage: StorageKind, obj: PersistMap): Promise<void> {
    try {
      const store = storeOf(storage);
      await store.setItem(KEY, JSON.stringify(obj || {}));
    } catch {
      // ignore
    }
  }

  static async readForm(
    formId: string,
    storage: StorageKind = "session",
  ): Promise<Record<string, any>> {
    const fid = String(formId || "").trim();
    if (!fid) return {};
    const all = await this.readAll(storage);
    const bag = all[fid];
    return bag && typeof bag === "object" ? bag : {};
  }

  static async setField(
    formId: string,
    fieldKey: string,
    value: any,
    storage: StorageKind = "session",
  ): Promise<void> {
    const fid = String(formId || "").trim();
    const k = String(fieldKey || "").trim();
    if (!fid || !k) return;

    const all = await this.readAll(storage);
    const bag = all[fid] && typeof all[fid] === "object" ? all[fid] : {};
    bag[k] = value;
    all[fid] = bag;
    await this.writeAll(storage, all);
  }

  static async setMany(
    formId: string,
    partial: Record<string, any>,
    storage: StorageKind = "session",
  ): Promise<void> {
    const fid = String(formId || "").trim();
    if (!fid || !partial || typeof partial !== "object") return;

    const all = await this.readAll(storage);
    const bag = all[fid] && typeof all[fid] === "object" ? all[fid] : {};
    Object.assign(bag, partial);
    all[fid] = bag;
    await this.writeAll(storage, all);
  }

  static async clear(
    formId: string,
    storage: StorageKind = "session",
  ): Promise<void> {
    const fid = String(formId || "").trim();
    if (!fid) return;

    const all = await this.readAll(storage);
    if (all[fid]) {
      delete all[fid];
      await this.writeAll(storage, all);
    }
  }
}
