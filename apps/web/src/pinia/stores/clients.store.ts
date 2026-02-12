import { defineStore } from "pinia";
import type { ClientRow } from "../types/clients.types";
import AdminApiService from "../../services/AdminApiService";
import MockRowsFactory from "../foundations/MockRowsFactory";

interface ClientsState {
  byId: Record<string, ClientRow>;
  ids: string[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  lastQuery: string;
}

export const useClientsStore = defineStore("clients", {
  state: (): ClientsState => ({
    byId: {},
    ids: [],
    loading: false,
    error: null,
    nextCursor: null,
    lastQuery: "",
  }),
  getters: {
    rows: (s) => s.ids.map((id) => s.byId[id]).filter(Boolean),
  },
  actions: {
    async list(args?: {
      reset?: boolean;
      q?: string;
      limit?: number;
      maxPages?: number;
    }) {
      this.loading = true;
      this.error = null;
      const query = typeof args?.q === "string" ? args.q.trim() : "";
      const queryChanged = query !== this.lastQuery;
      const shouldReset = Boolean(args?.reset) || queryChanged;
      try {
        if (shouldReset) {
          this.byId = {};
          this.ids = [];
          this.nextCursor = null;
          this.lastQuery = query;
        }

        let cursor: string | undefined = shouldReset
          ? undefined
          : this.nextCursor || undefined;
        let pageGuard = 0;
        const limit = args?.limit ?? 80;
        const requestedMaxPages = args?.maxPages;
        const maxPages = Math.max(
          1,
          typeof requestedMaxPages === "number" &&
            Number.isFinite(requestedMaxPages)
            ? Math.trunc(requestedMaxPages)
            : 1,
        );
        const existingIds = new Set(this.ids);

        do {
          const res = await AdminApiService.clientsList({
            q: query || undefined,
            cursor,
            limit,
          });

          const items = Array.isArray(res?.items) ? res.items : [];
          items.forEach((item: any) => {
            const normalizedId = normalizeClientId(item);
            if (!normalizedId) {
              return;
            }
            const row: ClientRow = {
              id: normalizedId,
              name: item.name,
              type: item.type,
              email: item.email,
              phone: item.phone,
              cellPhone: item.cellPhone,
              whatsappNumber: item.whatsappNumber,
              hasWhatsapp: item.hasWhatsapp,
              preferredContact: item.preferredContact,
              whatsappAnalytics: item.whatsappAnalytics,
              emailAnalytics: item.emailAnalytics,
              company: item.company,
              cnpj: item.cnpj,
              cep: item.cep,
              notes: item.notes,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
            this.byId[row.id] = row;
            if (!existingIds.has(row.id)) {
              this.ids.push(row.id);
              existingIds.add(row.id);
            }
          });

          cursor =
            typeof res?.nextCursor === "string" && res.nextCursor.trim()
              ? res.nextCursor
              : undefined;
          this.nextCursor = cursor ?? null;
          pageGuard++;
        } while (cursor && pageGuard < maxPages);
      } catch (e: any) {
        this.nextCursor = null;
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
          this.nextCursor = null;
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

const normalizeClientId = (item: any): string => {
  const id = item?.id ?? item?._id;
  if (typeof id === "string") {
    return id;
  }
  if (id && typeof id.toString === "function") {
    return String(id.toString());
  }
  return "";
};
