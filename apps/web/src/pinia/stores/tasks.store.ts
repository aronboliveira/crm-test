import { defineStore } from "pinia";
import type { TasksState, TaskRow } from "../types/tasks.types";
import type { Cursor, TablePrefs } from "../types/table.types";
import AdminApiService from "../../services/AdminApiService";
import MockRowsFactory from "../foundations/MockRowsFactory";

const DEFAULT_PREFS: TablePrefs = {
  pageSize: 40,
  sortBy: "updatedAt",
  sortDir: "desc",
  dense: false,
};

export const useTasksStore = defineStore("tasks", {
  state: (): TasksState => ({
    byId: {},
    ids: [],
    loading: false,
    error: null,
    nextCursor: null as Cursor,
    prefs: { ...DEFAULT_PREFS },
  }),

  getters: {
    rows: (s) => s.ids.map((id) => s.byId[id]).filter(Boolean),
    byProject: (s) => (pid: string) =>
      s.ids.map((id) => s.byId[id]).filter((t) => t && t.projectId === pid),
  },

  actions: {
    setPrefs(p: Partial<TablePrefs>) {
      this.prefs = { ...this.prefs, ...(p || {}) };
    },

    async list(
      args?: Readonly<{ reset?: boolean; q?: string; projectId?: string }>,
    ) {
      const reset = !!args?.reset;

      this.loading = true;
      this.error = null;

      try {
        const limit = this.prefs?.pageSize || DEFAULT_PREFS.pageSize;
        const cursor = reset ? undefined : this.nextCursor || undefined;

        const r = await AdminApiService.tasksList({
          limit,
          cursor,
          q: args?.q ? String(args.q) : undefined,
          projectId: args?.projectId ? String(args.projectId) : undefined,
        });

        const items = Array.isArray(r?.items) ? r.items : [];
        const nextCursor = r?.nextCursor ? String(r.nextCursor) : null;

        const rows = items
          .map((x: any) => normalizeTask(x))
          .filter(Boolean) as TaskRow[];

        if (reset) {
          this.byId = {};
          this.ids = [];
        }

        rows.forEach((t) => {
          this.byId[t.id] = t;
          this.ids.includes(t.id) ? void 0 : this.ids.push(t.id);
        });

        this.nextCursor = nextCursor;
      } catch (e: any) {
        const dev =
          typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;
        const fallback = dev
          ? MockRowsFactory.tasks(
              [],
              this.prefs?.pageSize || DEFAULT_PREFS.pageSize,
            )
          : [];
        if (fallback.length) {
          this.byId = {};
          this.ids = [];
          fallback.forEach((t) => ((this.byId[t.id] = t), this.ids.push(t.id)));
        }
        this.nextCursor = null;
        this.error = e?.message ? String(e.message) : "Failed to load tasks";
      } finally {
        this.loading = false;
      }
    },
  },
});

const normalizeTask = (x: any): TaskRow | null => {
  const id = normId(x);
  if (!id) return null;

  const projectId =
    String(x?.projectId || x?.project?.id || x?.project || "").trim() ||
    "p_unknown";
  const title = String(x?.title || x?.name || "").trim() || "Untitled task";
  const assigneeEmail =
    String(x?.assigneeEmail || x?.assignee?.email || "")
      .trim()
      .toLowerCase() || "unknown@corp.local";

  const status = String(x?.status || "todo").trim() as any;
  const pn = Number(x?.priority || 3);
  const priority = (pn >= 1 && pn <= 5 ? pn : 3) as any;

  const createdAt = String(x?.createdAt || new Date().toISOString());
  const updatedAt = String(x?.updatedAt || createdAt);
  const dueAt = x?.dueAt ? String(x.dueAt) : null;

  return {
    id,
    projectId,
    title,
    assigneeEmail,
    status,
    priority,
    dueAt,
    createdAt,
    updatedAt,
  };
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
