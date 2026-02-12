import type { PiniaPluginContext } from "pinia";
import ObjectDeep from "../../utils/ObjectDeep";
import SafeJsonService from "../../services/SafeJsonService";

type StorageKind = "session" | "local";

type PersistSpec = Readonly<{
  key: string;
  storage: StorageKind;
  includeStores: readonly string[];
}>;

export default class PersistPlugin {
  static #LOCAL_PREFS_KEY = "_pinia_local_prefs_v2";
  static #WRITE_DEBOUNCE_MS = 140;

  static #SPEC: readonly PersistSpec[] = ObjectDeep.freeze([
    {
      key: "_pinia_session_v1",
      storage: "session",
      includeStores: ["auth"],
    },
    {
      key: PersistPlugin.#LOCAL_PREFS_KEY,
      storage: "local",
      includeStores: ["projects", "tasks"],
    },
  ] as const);

  static #isObjectRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  static #pickTablePrefs(raw: unknown): Record<string, unknown> {
    if (!PersistPlugin.#isObjectRecord(raw)) {
      return {};
    }

    const prefs: Record<string, unknown> = {};
    const pageSize = raw.pageSize;
    const sortBy = raw.sortBy;
    const sortDir = raw.sortDir;
    const dense = raw.dense;

    if (typeof pageSize === "number" && Number.isFinite(pageSize)) {
      prefs.pageSize = pageSize;
    }
    if (typeof sortBy === "string" && sortBy.trim()) {
      prefs.sortBy = sortBy.trim();
    }
    if (typeof sortDir === "string" && sortDir.trim()) {
      prefs.sortDir = sortDir.trim();
    }
    if (typeof dense === "boolean") {
      prefs.dense = dense;
    }

    return prefs;
  }

  static #toHydratePatch(
    storeId: string,
    rawPatch: unknown,
  ): Record<string, unknown> | null {
    if (!PersistPlugin.#isObjectRecord(rawPatch)) {
      return null;
    }

    if (storeId === "projects" || storeId === "tasks") {
      return { prefs: PersistPlugin.#pickTablePrefs(rawPatch.prefs) };
    }

    return rawPatch;
  }

  static #toPersistSnapshot(
    storeId: string,
    state: unknown,
  ): Record<string, unknown> {
    if (storeId === "projects" || storeId === "tasks") {
      const source = PersistPlugin.#isObjectRecord(state) ? state : {};
      return { prefs: PersistPlugin.#pickTablePrefs(source.prefs) };
    }

    if (PersistPlugin.#isObjectRecord(state)) {
      return state;
    }
    return {};
  }

  static create() {
    return ({ store }: PiniaPluginContext) => {
      const spec = PersistPlugin.#SPEC.find((s) =>
        s.includeStores.includes(store.$id),
      );
      if (!spec) return;

      const st = spec.storage === "local" ? localStorage : sessionStorage;

      try {
        const raw = st.getItem(spec.key);
        const obj = SafeJsonService.parseObject(raw, {});
        const patch = PersistPlugin.#toHydratePatch(store.$id, obj[store.$id]);
        patch ? store.$patch(patch as any) : void 0;
      } catch {
        void 0;
      }

      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingState: unknown = store.$state;
      let lastSerialized = "";

      try {
        const raw = st.getItem(spec.key);
        lastSerialized = typeof raw === "string" ? raw : "";
      } catch {
        lastSerialized = "";
      }

      const flush = () => {
        flushTimer = null;

        try {
          const raw = st.getItem(spec.key);
          const obj = SafeJsonService.parseObject(raw, {});
          const next = PersistPlugin.#isObjectRecord(obj) ? { ...obj } : {};

          next[store.$id] = PersistPlugin.#toPersistSnapshot(
            store.$id,
            pendingState,
          );
          const serialized = SafeJsonService.tryStringify(next);
          if (!serialized || serialized === lastSerialized) {
            return;
          }
          st.setItem(spec.key, serialized);
          lastSerialized = serialized;
        } catch {
          void 0;
        }
      };

      store.$subscribe(
        (_m, state) => {
          pendingState = state;
          if (flushTimer) {
            clearTimeout(flushTimer);
          }
          flushTimer = setTimeout(flush, PersistPlugin.#WRITE_DEBOUNCE_MS);
        },
        { detached: true },
      );

      try {
        const raw = st.getItem(spec.key);
        if (!raw && (store.$id === "projects" || store.$id === "tasks")) {
          flush();
        }
      } catch {
        void 0;
      }
    };
  }
}
