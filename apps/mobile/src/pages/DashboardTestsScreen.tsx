import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AdminApiService from "../services/AdminApiService";

/**
 * Minimal local equivalents of your Pinia types.
 * You can replace these with real imports if you already have them in RN.
 */
type Cursor = string | null;

type TaskRow = {
  id: string;
  projectId: string;
  title: string;
  assigneeEmail: string;
  status: "todo" | "doing" | "done" | string;
  priority: 1 | 2 | 3 | 4 | 5;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TablePrefs = {
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  dense: boolean;
};

const DEFAULT_PREFS: TablePrefs = {
  pageSize: 40,
  sortBy: "updatedAt",
  sortDir: "desc",
  dense: false,
};

function safeTrim(v: unknown): string {
  return String(v ?? "").trim();
}

function normId(x: any): string {
  const a = typeof x?.id === "string" ? x.id : "";
  const b = typeof x?._id === "string" ? x._id : "";
  const c =
    x?._id && typeof x._id.toString === "function"
      ? String(x._id.toString())
      : "";
  const d = x?._id?.$oid && typeof x._id.$oid === "string" ? x._id.$oid : "";
  return (a || b || c || d || "").trim();
}

function normalizeTask(x: any): TaskRow | null {
  const id = normId(x);
  if (!id) return null;

  const projectId =
    safeTrim(x?.projectId || x?.project?.id || x?.project || "") || "p_unknown";
  const title = safeTrim(x?.title || x?.name || "") || "Untitled task";
  const assigneeEmail =
    safeTrim(x?.assigneeEmail || x?.assignee?.email || "").toLowerCase() ||
    "unknown@corp.local";

  const status = safeTrim(x?.status || "todo") || "todo";
  const pn = Number(x?.priority || 3);
  const priority = (pn >= 1 && pn <= 5 ? pn : 3) as 1 | 2 | 3 | 4 | 5;

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
}

function mockTasks(seed: number, count: number): TaskRow[] {
  const rows: TaskRow[] = [];
  for (let i = 0; i < count; i++) {
    const n = seed + i + 1;
    rows.push({
      id: `mock-task-${n}`,
      projectId: `p_${((n % 8) + 1).toString().padStart(2, "0")}`,
      title: `Mock Task ${n}`,
      assigneeEmail: `user${(n % 10) + 1}@corp.local`,
      status: ["todo", "doing", "done"][n % 3],
      priority: ((n % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      dueAt: `2026-0${(n % 9) + 1}-2${n % 9}`,
      createdAt: new Date(Date.now() - n * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - n * 43_200_000).toISOString(),
    });
  }
  return rows;
}

/**
 * Inline equivalent of your useDashboardTasksPage() + Pinia tasks.store.
 * Returns the same shape the Vue page expects, but in RN form (q + setQ).
 */
function useDashboardTasksPageInline() {
  const [prefs] = useState<TablePrefs>({ ...DEFAULT_PREFS });

  const [byId, setById] = useState<Record<string, TaskRow>>({});
  const [ids, setIds] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<Cursor>(null);

  const rows = useMemo(
    () => ids.map((id) => byId[id]).filter(Boolean),
    [ids, byId],
  );

  const list = useCallback(
    async (
      args?: Readonly<{ reset?: boolean; q?: string; projectId?: string }>,
    ) => {
      const reset = !!args?.reset;

      setLoading(true);
      setError(null);

      try {
        const limit = prefs.pageSize;
        const cursor = reset ? undefined : nextCursor || undefined;

        const r = await AdminApiService.tasksList({
          limit,
          cursor,
          q: args?.q ? String(args.q) : undefined,
          projectId: args?.projectId ? String(args.projectId) : undefined,
        });

        const items = Array.isArray((r as any)?.items) ? (r as any).items : [];
        const nc = (r as any)?.nextCursor
          ? String((r as any).nextCursor)
          : null;

        const normalized = items
          .map(normalizeTask)
          .filter(Boolean) as TaskRow[];

        if (reset) {
          setById({});
          setIds([]);
        }

        setById((prev) => {
          const next = reset ? {} : { ...prev };
          for (const t of normalized) next[t.id] = t;
          return next;
        });

        setIds((prev) => {
          const base = reset ? [] : [...prev];
          for (const t of normalized) {
            if (!base.includes(t.id)) base.push(t.id);
          }
          return base;
        });

        setNextCursor(nc);
      } catch (e: any) {
        // RN replacement for import.meta.env.DEV
        const dev = typeof __DEV__ !== "undefined" && __DEV__ === true;

        if (dev) {
          // MockRowsFactory.tasks([], pageSize) equivalent
          const seed = 0;
          const fallbackAll = mockTasks(seed, prefs.pageSize);

          // Apply local q filter (server-side on real endpoint)
          const query = safeTrim(args?.q ?? qRef.current).toLowerCase();
          const fallback = !query
            ? fallbackAll
            : fallbackAll.filter((t) => {
                const hay =
                  `${t.title} ${t.projectId} ${t.assigneeEmail} ${t.status} ${t.priority}`.toLowerCase();
                return hay.includes(query);
              });

          setById(() => {
            const next: Record<string, TaskRow> = {};
            fallback.forEach((t) => (next[t.id] = t));
            return next;
          });
          setIds(fallback.map((t) => t.id));
          setNextCursor(null);
          setError("Backend unavailable. Showing fallback mock data.");
        } else {
          setById({});
          setIds([]);
          setNextCursor(null);
          setError(e?.message ? String(e.message) : "Failed to load tasks");
        }
      } finally {
        setLoading(false);
      }
    },
    [nextCursor, prefs.pageSize],
  );

  const load = useCallback(
    async (reset = false) => {
      if (typeof reset !== "boolean") {
        console.warn("[DashboardTasksScreen] load: reset must be boolean");
        reset = false;
      }
      await list({ reset, q: qRef.current || undefined });
    },
    [list],
  );

  const more = useCallback(async () => {
    if (!nextCursor) {
      console.warn("[DashboardTasksScreen] more: no cursor available");
      return;
    }
    await load(false);
  }, [load, nextCursor]);

  useEffect(() => {
    (async () => {
      try {
        // Mirrors: if (!tasks.rows.length) tasks.list({reset:true}); then load(true)
        await list({ reset: true });
        await load(true);
      } catch (e) {
        console.error("[DashboardTasksScreen] mount load failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, q, setQ, loading, error, nextCursor, load, more };
}

export default function DashboardTasksScreen() {
  const { rows, q, setQ, loading, error, nextCursor, load, more } =
    useDashboardTasksPageInline();

  return (
    <View style={styles.page} accessibilityLabel="Tasks">
      <View style={styles.header}>
        <View style={styles.headText}>
          <Text style={styles.h1}>Tasks</Text>
          <Text style={styles.sub}>
            Same pattern as projects; edit is a stub for now.
          </Text>
        </View>

        <View style={styles.controls}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="search"
            accessibilityLabel="Search tasks"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => void load(true)}
          />

          <Pressable
            onPress={() => void load(true)}
            disabled={loading}
            accessibilityLabel="Reload"
            style={({ pressed }) => [
              styles.btnPrimary,
              loading && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.btnText}>Reload</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card} accessibilityLabel="Tasks table" role="region">
        {loading ? (
          <View style={styles.busyRow}>
            <ActivityIndicator />
            <Text style={styles.busyText}>Loading…</Text>
          </View>
        ) : null}

        <ScrollView horizontal contentContainerStyle={styles.tableMinWidth}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colTitle]}>Title</Text>
              <Text style={[styles.th, styles.colProject]}>Project</Text>
              <Text style={[styles.th, styles.colAssignee]}>Assignee</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colPriority]}>Priority</Text>
              <Text style={[styles.th, styles.colDue]}>Due</Text>
              <Text style={[styles.th, styles.colActions]}>Actions</Text>
            </View>

            {rows.map((t, idx) => {
              const key = String(t?.id || `row-${idx}`);
              return (
                <View key={key} style={[styles.tr, styles.tdRow]}>
                  <Text
                    style={[styles.td, styles.colTitle, styles.bold]}
                    numberOfLines={1}
                  >
                    {t?.title ?? "-"}
                  </Text>
                  <Text
                    style={[styles.td, styles.colProject]}
                    numberOfLines={1}
                  >
                    {t?.projectId ?? "-"}
                  </Text>
                  <Text
                    style={[styles.td, styles.colAssignee]}
                    numberOfLines={1}
                  >
                    {t?.assigneeEmail ?? "-"}
                  </Text>
                  <Text style={[styles.td, styles.colStatus]} numberOfLines={1}>
                    {t?.status ?? "-"}
                  </Text>
                  <Text
                    style={[styles.td, styles.colPriority]}
                    numberOfLines={1}
                  >
                    {String(t?.priority ?? "-")}
                  </Text>
                  <Text style={[styles.td, styles.colDue]} numberOfLines={1}>
                    {t?.dueAt ?? "-"}
                  </Text>

                  <View style={[styles.td, styles.colActions]}>
                    <Pressable
                      onPress={() => {
                        // TODO: navigation stub
                      }}
                      accessibilityLabel="Edit task"
                      style={({ pressed }) => [
                        styles.btnGhostSm,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.btnText}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {!rows.length && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{error || "No tasks."}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void more()}
          disabled={!nextCursor || loading}
          accessibilityLabel="Load more"
          style={({ pressed }) => [
            styles.btnGhost,
            (!nextCursor || loading) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>Load more</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12 },

  header: { gap: 10 },
  headText: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "800" },
  sub: { opacity: 0.7 },

  controls: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    minWidth: 220,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },

  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
  },
  busyText: { opacity: 0.8 },

  tableMinWidth: { minWidth: 1100 },
  table: { flex: 1 },

  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  thRow: { opacity: 0.85 },
  tdRow: {},
  th: { paddingVertical: 10, paddingRight: 12, fontWeight: "700" },
  td: { paddingVertical: 10, paddingRight: 12 },

  colTitle: { width: 260 },
  colProject: { width: 160 },
  colAssignee: { width: 220 },
  colStatus: { width: 120 },
  colPriority: { width: 90 },
  colDue: { width: 140 },
  colActions: { width: 120 },

  bold: { fontWeight: "700" },

  empty: { paddingVertical: 24, alignItems: "center" },
  emptyText: { opacity: 0.7 },

  footer: { alignItems: "flex-end" },

  btnText: { fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },

  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhostSm: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
  },
});
