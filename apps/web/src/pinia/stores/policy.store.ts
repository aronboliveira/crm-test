import { defineStore } from "pinia";
import ApiClientService from "../../services/ApiClientService";

export const usePolicyStore = defineStore("policy", {
  state: () => ({
    ready: false,
    perms: [] as string[],
  }),

  getters: {
    isReady: (s) => !!s.ready,
  },

  actions: {
    /**
     * Check whether the current user has a specific permission.
     * Implemented as an action (not a getter returning a closure)
     * to avoid stale-closure and computed-caching issues with Pinia.
     */
    can(perm: string): boolean {
      const needle = String(perm || "").trim();
      if (!needle) return false;
      // Defensive: iterate the live state array
      const arr: string[] = this.perms ?? [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === needle) return true;
      }
      return false;
    },

    async bootstrap(): Promise<void> {
      try {
        console.log("[PolicyStore] bootstrap() called");

        // Always fetch fresh from the API — no sessionStorage double-cache.
        // The PersistPlugin already handles state rehydration across tabs.
        const response = await ApiClientService.raw.get("/auth/me");
        const me = response?.data as Record<string, unknown> | null;

        console.log("[PolicyStore] /auth/me response:", {
          status: response?.status,
          hasPerms: Array.isArray(me?.perms),
          permCount: Array.isArray(me?.perms) ? (me!.perms as any).length : 0,
          hasPermCodes: Array.isArray(me?.permissionCodes),
        });

        const raw: unknown[] = Array.isArray(me?.perms)
          ? (me!.perms as unknown[])
          : Array.isArray(me?.permissionCodes)
            ? (me!.permissionCodes as unknown[])
            : [];

        // Store as a plain mutable string array (no freeze) for full
        // Pinia reactivity compatibility.
        const perms: string[] = raw
          .map((p) => String(p ?? "").trim())
          .filter(Boolean);

        console.log(`[PolicyStore] Loaded ${perms.length} permissions:`, perms);

        this.perms = perms;
        this.ready = true;
      } catch (error) {
        console.error("[PolicyStore] bootstrap() FAILED:", error);
        // Mark ready so the router guard doesn't loop, but perms stay empty.
        this.ready = true;
      }
    },

    reset() {
      this.perms = [];
      this.ready = false;
    },
  },
});
