import type { PiniaPluginContext } from "pinia";
import ObjectDeep from "../../utils/ObjectDeep";

type StorageKind = "session" | "local";

type PersistSpec = Readonly<{
  key: string;
  storage: StorageKind;
  includeStores: readonly string[];
}>;

export default class PersistPlugin {
  static #SPEC: readonly PersistSpec[] = ObjectDeep.freeze([
    {
      key: "_pinia_session_v1",
      storage: "session",
      includeStores: ["auth", "policy"],
    },
    {
      key: "_pinia_local_v1",
      storage: "local",
      includeStores: ["projects", "tasks"],
    },
  ] as const);

  static create() {
    return ({ store }: PiniaPluginContext) => {
      const spec = PersistPlugin.#SPEC.find((s) =>
        s.includeStores.includes(store.$id),
      );
      if (!spec) return;

      const st = spec.storage === "local" ? localStorage : sessionStorage;

      try {
        const raw = st.getItem(spec.key);
        const obj = raw ? JSON.parse(raw) : null;
        const patch = obj && typeof obj === "object" ? obj[store.$id] : null;

        patch && typeof patch === "object" ? store.$patch(patch) : void 0;
      } catch {
        void 0;
      }

      store.$subscribe((_m, state) => {
        try {
          const raw = st.getItem(spec.key);
          const obj = raw ? JSON.parse(raw) : {};
          const next = obj && typeof obj === "object" ? obj : {};

          next[store.$id] = state;
          st.setItem(spec.key, JSON.stringify(next));
        } catch {
          void 0;
        }
      });
    };
  }
}
