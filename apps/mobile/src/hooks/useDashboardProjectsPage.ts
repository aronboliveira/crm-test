import { useCallback, useMemo, useRef, useState } from "react";
import AdminApiService from "../services/AdminApiService";

/**
 * Keep this loose, since your Vue code uses Record<string, unknown>.
 * You can replace with a real Project type later.
 */
export type ProjectRow = Record<string, any>;

type LoadResult = {
  items: ProjectRow[];
  nextCursor: string | null;
};

function mockProjects(count = 25, offset = 0): ProjectRow[] {
  const rows: ProjectRow[] = [];
  for (let i = 0; i < count; i++) {
    const n = offset + i + 1;
    rows.push({
      id: `mock-${n}`,
      code: `PRJ-${String(n).padStart(4, "0")}`,
      name: `Mock Project ${n}`,
      ownerEmail: `owner${(n % 7) + 1}@corp.local`,
      status: ["active", "paused", "done"][n % 3],
      dueAt: `2026-0${(n % 9) + 1}-15`,
    });
  }
  return rows;
}

function safeTrim(v: string): string {
  return String(v || "").trim();
}

/**
 * RN equivalent of: useDashboardProjectsPage()
 * Exposes:
 * - rows, loading, error, nextCursor, q, load(reset), more()
 */
export function useDashboardProjectsPage() {
  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Cursor as opaque string
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (loading) return;

      setLoading(true);
      setError("");

      try {
        if (typeof reset !== "boolean") {
          console.warn(
            "[useDashboardProjectsPage] load: reset must be boolean",
          );
          reset = false;
        }

        const effectiveCursor = reset ? null : cursor;

        if (reset) {
          setRows([]);
          setCursor(null);
          setNextCursor(null);
        }

        const query = safeTrim(qRef.current);
        // Prefer your admin endpoint (matches earlier AdminApiService.projectsList)
        const r = await AdminApiService.projectsList({
          q: query || undefined,
          cursor: effectiveCursor || undefined,
          limit: 40,
        });

        const items = Array.isArray(r?.items) ? (r.items as ProjectRow[]) : [];
        const nc = r?.nextCursor ? String(r.nextCursor) : null;

        setRows((prev) => (reset ? items : [...prev, ...items]));
        setCursor(nc);
        setNextCursor(nc);
      } catch (e) {
        console.warn(
          "[useDashboardProjectsPage] backend failed, using fallback mocks:",
          e,
        );

        // Dev fallback mocks, with simple cursor emulation
        const pageSize = 25;
        const offset = reset ? 0 : parseInt(String(cursor || "0"), 10) || 0;

        const items = mockProjects(pageSize, offset).filter((p) => {
          const query = safeTrim(qRef.current).toLowerCase();
          if (!query) return true;
          const hay =
            `${p.code || ""} ${p.name || ""} ${p.ownerEmail || ""}`.toLowerCase();
          return hay.includes(query);
        });

        const newOffset = offset + pageSize;
        const nc = items.length ? String(newOffset) : null;

        setRows((prev) => (reset ? items : [...prev, ...items]));
        setCursor(nc);
        setNextCursor(nc);

        setError("Backend unavailable. Showing fallback mock data.");
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading],
  );

  const more = useCallback(async () => {
    if (loading) return;
    if (!nextCursor) return;
    await load(false);
  }, [load, loading, nextCursor]);

  // Optional: auto-load first page when hook is used
  // (Your Vue page probably does this inside the composable.)
  // If you want auto-load, uncomment below:
  //
  // useEffect(() => {
  //   void load(true);
  // }, []);

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
