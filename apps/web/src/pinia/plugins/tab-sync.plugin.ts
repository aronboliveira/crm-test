import type { PiniaPluginContext } from "pinia";

export default class TabSyncPlugin {
  static #BOUND = "data-pinia-tab-sync";

  static create() {
    return ({ store }: PiniaPluginContext) => {
      const root = document.documentElement;
      if (!root) return;

      if (root.hasAttribute(TabSyncPlugin.#BOUND)) return;
      root.setAttribute(TabSyncPlugin.#BOUND, "1");

      const onStorage = (ev: StorageEvent) => {
        const k = String(ev?.key || "");
        k === "_pinia_session_v1"
          ? window.dispatchEvent(new CustomEvent("app:session-sync"))
          : void 0;
        k === "_pinia_local_v1"
          ? window.dispatchEvent(new CustomEvent("app:prefs-sync"))
          : void 0;
      };

      window.addEventListener("storage", onStorage);
      void store;
    };
  }
}
