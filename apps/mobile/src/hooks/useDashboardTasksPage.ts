import { useCallback, useMemo, useRef, useState } from "react";
import AdminApiService from "../services/AdminApiService";

export type TaskRow = {
  id: string;
  projectId: string;
  title: string;
  assigneeEmail: string;
  status: string;
  priority: 1 | 2 | 3 | 4 | 5;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeTrim(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (
    value &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    return String((value as { toString: () => string }).toString()).trim();
  }
  return "";
}

function normalizeTask(raw: any): TaskRow | null {
  const id = normalizeId(raw?.id || raw?._id || raw?._id?.$oid);
  if (!id) return null;

  const projectId =
    safeTrim(raw?.projectId || raw?.project?.id || raw?.project) || "p_unknown";
  const title = safeTrim(raw?.title || raw?.name) || "Untitled task";
  const assigneeEmail =
    safeTrim(raw?.assigneeEmail || raw?.assignee?.email).toLowerCase() ||
    "unknown@corp.local";
  const status = safeTrim(raw?.status || "todo") || "todo";
  const priorityRaw = Number(raw?.priority ?? 3);
  const priority = (priorityRaw >= 1 && priorityRaw <= 5 ? priorityRaw : 3) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const createdAt = String(raw?.createdAt || new Date().toISOString());
  const updatedAt = String(raw?.updatedAt || createdAt);
  const dueAt = raw?.dueAt ? String(raw.dueAt) : null;

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

function mockTasks(offset: number, count: number): TaskRow[] {
  const rows: TaskRow[] = [];
  for (let index = 0; index < count; index++) {
    const current = offset + index + 1;
    rows.push({
      id: `mock-task-${current}`,
      projectId: `p_${((current % 8) + 1).toString().padStart(2, "0")}`,
      title: `Mock Task ${current}`,
      assigneeEmail: `user${(current % 10) + 1}@corp.local`,
      status: ["todo", "doing", "done"][current % 3] || "todo",
      priority: ((current % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      dueAt: `2026-0${(current % 9) + 1}-2${current % 9}`,
      createdAt: new Date(Date.now() - current * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - current * 43_200_000).toISOString(),
    });
  }
  return rows;
}

export function useDashboardTasksPage() {
  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (loading) return;

      setLoading(true);
      setError("");

      try {
        const effectiveReset = typeof reset === "boolean" ? reset : false;
        const effectiveCursor = effectiveReset ? null : cursor;

        if (effectiveReset) {
          setRows([]);
          setCursor(null);
          setNextCursor(null);
        }

        const query = safeTrim(qRef.current);
        const response = await AdminApiService.tasksList({
          q: query || undefined,
          cursor: effectiveCursor || undefined,
          limit: 40,
        });

        const items = Array.isArray(response?.items)
          ? response.items.map(normalizeTask).filter(Boolean)
          : [];
        const normalizedItems = items as TaskRow[];
        const newCursor = response?.nextCursor
          ? String(response.nextCursor)
          : null;

        setRows((prev) =>
          effectiveReset ? normalizedItems : [...prev, ...normalizedItems],
        );
        setCursor(newCursor);
        setNextCursor(newCursor);
      } catch (requestError) {
        const offset = reset ? 0 : parseInt(String(cursor || "0"), 10) || 0;
        const pageSize = 25;
        const fallbackRows = mockTasks(offset, pageSize).filter((task) => {
          const query = safeTrim(qRef.current).toLowerCase();
          if (!query) return true;
          const haystack =
            `${task.title} ${task.projectId} ${task.assigneeEmail} ${task.status} ${task.priority}`.toLowerCase();
          return haystack.includes(query);
        });

        const newOffset = offset + pageSize;
        const fallbackCursor = fallbackRows.length ? String(newOffset) : null;

        setRows((prev) => (reset ? fallbackRows : [...prev, ...fallbackRows]));
        setCursor(fallbackCursor);
        setNextCursor(fallbackCursor);
        setError("Backend unavailable. Showing fallback mock data.");
        console.warn("[useDashboardTasksPage] fallback mode:", requestError);
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading],
  );

  const more = useCallback(async () => {
    if (loading || !nextCursor) return;
    await load(false);
  }, [load, loading, nextCursor]);

  return useMemo(
    () => ({
      rows,
      loading,
      error,
      nextCursor,
      q,
      setQ,
      load,
      more,
    }),
    [rows, loading, error, nextCursor, q, load, more],
  );
}
