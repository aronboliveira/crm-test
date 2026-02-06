import { defineStore } from "pinia";
import type { ProjectsState, ProjectRow } from "../types/projects.types";
import type { Cursor, TablePrefs } from "../types/table.types";
import AdminApiService from "../../services/AdminApiService";
import MockRowsFactory from "../foundations/MockRowsFactory";

const DEFAULT_PREFS: TablePrefs = {
  pageSize: 25,
  sortBy: "updatedAt",
  sortDir: "desc",
  dense: false,
};

export const useProjectsStore = defineStore("projects", {
  state: (): ProjectsState => ({
    byId: {},
    ids: [],
    loading: false,
    error: null,
    nextCursor: null as Cursor,
    prefs: { ...DEFAULT_PREFS },
  }),

  getters: {
    rows: (s) => s.ids.map((id) => s.byId[id]).filter(Boolean),
    prefs: (s) => s.prefs,
  },

  actions: {
    setPrefs(p: Partial<TablePrefs>) {
      this.prefs = { ...this.prefs, ...(p || {}) };
    },

    async list(args?: Readonly<{ reset?: boolean; q?: string }>) {
      const reset = !!args?.reset;

      this.loading = true;
      this.error = null;

      try {
        const limit = this.prefs.pageSize;
        const cursor = reset ? undefined : this.nextCursor || undefined;

        const r = await AdminApiService.projectsList({
          limit,
          cursor,
          q: args?.q ? String(args.q) : undefined,
        });
        const items = Array.isArray(r?.items) ? r.items : [];
        const nextCursor = r?.nextCursor ? String(r.nextCursor) : null;

        const rows = items
          .map((x: any) => normalizeProject(x))
          .filter(Boolean) as ProjectRow[];

        if (reset) {
          this.byId = {};
          this.ids = [];
        }

        rows.forEach((p) => {
          this.byId[p.id] = p;
          this.ids.includes(p.id) ? void 0 : this.ids.push(p.id);
        });

        this.nextCursor = nextCursor;
      } catch (e: any) {
        const dev =
          typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;
        const fallback = dev
          ? MockRowsFactory.projects(this.prefs.pageSize)
          : [];
        if (fallback.length) {
          this.byId = {};
          this.ids = [];
          fallback.forEach((p) => ((this.byId[p.id] = p), this.ids.push(p.id)));
        }
        this.nextCursor = null;
        this.error = e?.message ? String(e.message) : "Failed to load projects";
      } finally {
        this.loading = false;
      }
    },
  },
});

const normalizeProject = (x: any): ProjectRow | null => {
  const id = normId(x);
  if (!id) return null;

  const code = String(x?.code || "").trim() || `PRJ-${id.slice(-6)}`;
  const name = String(x?.name || "").trim() || "Untitled project";
  const ownerEmail =
    String(x?.ownerEmail || x?.owner?.email || "")
      .trim()
      .toLowerCase() || "unknown@corp.local";
  const status = String(x?.status || "planned").trim() as any;

  const createdAt = String(x?.createdAt || new Date().toISOString());
  const updatedAt = String(x?.updatedAt || createdAt);
  const dueAt = x?.dueAt ? String(x.dueAt) : null;

  return { id, code, name, ownerEmail, status, dueAt, createdAt, updatedAt };
};

const normId = (x: any): string => {
  const a = typeof x?.id === "string" ? x.id : "";
  const b = typeof x?._id === "string" ? x._id : "";
  const c =
    x?._id && typeof x._id.toString === "function"
      ? String(x._id.toString())
      : "";
  const d = x?._id?.$oid && typeof x._id.$oid === "string" ? x._id.$oid : "";
  return (a || b || c || d || "").trim();
};
