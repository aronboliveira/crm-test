import { defineStore } from "pinia";
import type { ClientRow } from "../types/clients.types";
import AdminApiService from "../../services/AdminApiService";
import MockRowsFactory from "../foundations/MockRowsFactory";

interface ClientsState {
  byId: Record<string, ClientRow>;
  ids: string[];
  loading: boolean;
  error: string | null;
}

export const useClientsStore = defineStore("clients", {
  state: (): ClientsState => ({
    byId: {},
    ids: [],
    loading: false,
    error: null,
  }),
  getters: {
    rows: (s) => s.ids.map((id) => s.byId[id]).filter(Boolean),
  },
  actions: {
    async list(args?: { reset?: boolean; q?: string }) {
      this.loading = true;
      this.error = null;
      try {
        // Fallback for mock if offline or just testing
        const res = await AdminApiService.clientsList({ q: args?.q });

        const items = Array.isArray(res?.items) ? res.items : [];
        if (args?.reset) {
          this.byId = {};
          this.ids = [];
        }
        items.forEach((item: any) => {
          const row: ClientRow = {
            id: item.id || item._id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            company: item.company,
            notes: item.notes,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
          this.byId[row.id] = row;
          if (!this.ids.includes(row.id)) this.ids.push(row.id);
        });
      } catch (e: any) {
        const dev =
          typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;
        const fallback = dev ? MockRowsFactory.clients(18) : [];
        const usedFallback = fallback.length > 0;
        if (usedFallback) {
          this.byId = {};
          this.ids = [];
          fallback.forEach((c) => {
            this.byId[c.id] = c;
            this.ids.push(c.id);
          });
        }
        console.error("Failed to load clients", e);
        this.error = usedFallback
          ? null
          : e?.message
            ? String(e.message)
            : "Failed to load clients";
      } finally {
        this.loading = false;
      }
    },
  },
});
