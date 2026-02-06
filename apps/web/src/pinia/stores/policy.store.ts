import { defineStore } from "pinia";
import ApiClientService from "../../services/ApiClientService";
import ObjectDeep from "../../utils/ObjectDeep";

export const usePolicyStore = defineStore("policy", {
  state: () => ({
    ready: false,
    perms: ObjectDeep.freeze([] as string[]),
  }),

  getters: {
    isReady: (s) => !!s.ready,
    can: (s) => (perm: string) => s.perms.includes(String(perm || "").trim()),
  },

  actions: {
    async bootstrap() {
      const cached = (() => {
        try {
          const raw = sessionStorage.getItem("_policy_perms_v1");
          const arr = raw ? JSON.parse(raw) : null;
          return Array.isArray(arr) ? arr.map(String) : null;
        } catch {
          return null;
        }
      })();

      if (cached && cached.length) {
        this.perms = ObjectDeep.freeze(cached) as any;
        this.ready = true;
        return;
      }

      const me = (await ApiClientService.raw.get("/api/me")).data as any;
      const perms = Array.isArray(me?.permissionCodes)
        ? me.permissionCodes.map(String)
        : [];

      try {
        sessionStorage.setItem("_policy_perms_v1", JSON.stringify(perms));
      } catch {
        void 0;
      }

      this.perms = ObjectDeep.freeze(perms) as any;
      this.ready = true;
    },

    reset() {
      try {
        sessionStorage.removeItem("_policy_perms_v1");
      } catch {
        void 0;
      }
      this.perms = ObjectDeep.freeze([]) as any;
      this.ready = true;
    },
  },
});
