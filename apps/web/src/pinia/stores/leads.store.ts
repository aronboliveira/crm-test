import { defineStore } from "pinia";
import type { LeadRow } from "../types/leads.types";
import ApiClientService from "../../services/ApiClientService";
import MockRowsFactory from "../foundations/MockRowsFactory";

interface LeadsState {
  byId: Record<string, LeadRow>;
  ids: string[];
  loading: boolean;
  error: string | null;
}

export const useLeadsStore = defineStore("leads", {
  state: (): LeadsState => ({
    byId: {},
    ids: [],
    loading: false,
    error: null,
  }),

  getters: {
    rows: (s): LeadRow[] =>
      s.ids.map((id) => s.byId[id]).filter(Boolean) as LeadRow[],

    byStatus(): Record<string, LeadRow[]> {
      const map: Record<string, LeadRow[]> = {};
      for (const row of this.rows) {
        const key = row.status;
        if (!map[key]) map[key] = [];
        (map[key] as LeadRow[]).push(row);
      }
      return map;
    },

    totalEstimatedValue(): number {
      return this.rows.reduce(
        (sum: number, r: LeadRow) => sum + (r.estimatedValue || 0),
        0,
      );
    },

    conversionRate(): number {
      if (!this.rows.length) return 0;
      const won = this.rows.filter((r: LeadRow) => r.status === "won").length;
      return Math.round((won / this.rows.length) * 100);
    },
  },

  actions: {
    async list(args?: { reset?: boolean; q?: string; status?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const res = await ApiClientService.leads.list(args?.q, args?.status);
        const items = Array.isArray(res?.items) ? res.items : [];

        if (args?.reset) {
          this.byId = {};
          this.ids = [];
        }

        items.forEach((item: any) => {
          const row: LeadRow = {
            id: item.id || item._id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            company: item.company,
            status: item.status || "new",
            source: item.source || "other",
            assignedTo: item.assignedTo,
            estimatedValue: item.estimatedValue,
            notes: item.notes,
            tags: item.tags,
            campaigns: item.campaigns,
            contracts: item.contracts,
            ctaSuggestions: item.ctaSuggestions,
            lastContactAt: item.lastContactAt,
            convertedClientId: item.convertedClientId,
            lostReason: item.lostReason,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
          this.byId[row.id] = row;
          if (!this.ids.includes(row.id)) this.ids.push(row.id);
        });
      } catch (e: any) {
        const dev =
          typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;
        const fallback = dev ? MockRowsFactory.leads(24) : [];
        const usedFallback = fallback.length > 0;
        if (usedFallback) {
          this.byId = {};
          this.ids = [];
          fallback.forEach((l) => {
            this.byId[l.id] = l;
            this.ids.push(l.id);
          });
        }
        console.error("Failed to load leads", e);
        this.error = usedFallback
          ? null
          : e?.message
            ? String(e.message)
            : "Failed to load leads";
      } finally {
        this.loading = false;
      }
    },
  },
});
