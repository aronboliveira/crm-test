import { useCallback, useMemo, useRef, useState } from "react";
import AdminApiService from "../services/AdminApiService";

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  preferredContact: string;
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

function normalizeClient(raw: any): ClientRow | null {
  const id = normalizeId(raw?.id || raw?._id || raw?._id?.$oid);
  if (!id) return null;

  const name = safeTrim(raw?.name || raw?.fullName || raw?.contactName) || "-";
  const email = safeTrim(raw?.email).toLowerCase() || "-";
  const phone =
    safeTrim(raw?.phone || raw?.cellPhone || raw?.whatsappNumber) || "-";
  const company = safeTrim(raw?.company) || "-";
  const preferredContact = safeTrim(raw?.preferredContact) || "-";
  const createdAt = String(raw?.createdAt || new Date().toISOString());
  const updatedAt = String(raw?.updatedAt || createdAt);

  return {
    id,
    name,
    email,
    phone,
    company,
    preferredContact,
    createdAt,
    updatedAt,
  };
}

function mockClients(offset: number, count: number): ClientRow[] {
  const rows: ClientRow[] = [];
  for (let index = 0; index < count; index++) {
    const current = offset + index + 1;
    rows.push({
      id: `mock-client-${current}`,
      name: `Mock Client ${current}`,
      email: `client${current}@corp.local`,
      phone: `+55 11 9${String(10000000 + current).slice(0, 8)}`,
      company: current % 2 === 0 ? `Company ${current}` : "-",
      preferredContact: current % 2 === 0 ? "email" : "phone",
      createdAt: new Date(Date.now() - current * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - current * 43_200_000).toISOString(),
    });
  }
  return rows;
}

export function useDashboardClientsPage() {
  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;

  const [rows, setRows] = useState<ClientRow[]>([]);
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
        const response = await AdminApiService.clientsList({
          q: query || undefined,
          cursor: effectiveCursor || undefined,
          limit: 40,
        });

        const items = Array.isArray(response?.items)
          ? response.items.map(normalizeClient).filter(Boolean)
          : [];
        const normalizedItems = items as ClientRow[];
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
        const fallbackRows = mockClients(offset, pageSize).filter((client) => {
          const query = safeTrim(qRef.current).toLowerCase();
          if (!query) return true;
          const haystack =
            `${client.name} ${client.email} ${client.phone} ${client.company}`.toLowerCase();
          return haystack.includes(query);
        });

        const newOffset = offset + pageSize;
        const fallbackCursor = fallbackRows.length ? String(newOffset) : null;

        setRows((prev) => (reset ? fallbackRows : [...prev, ...fallbackRows]));
        setCursor(fallbackCursor);
        setNextCursor(fallbackCursor);
        setError("Backend unavailable. Showing fallback mock data.");
        console.warn("[useDashboardClientsPage] fallback mode:", requestError);
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
