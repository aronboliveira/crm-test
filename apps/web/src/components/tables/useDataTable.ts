import { computed, ref, type ComputedRef, type Ref } from "vue";
import { DateValidator } from "@corp/foundations";
import type {
  ColumnDef,
  RowAction,
  SortDir,
  TableConfig,
} from "./dataTable.types";

type SortState = Readonly<{ colId: string | null; dir: SortDir }>;

type Vm<T> = Readonly<{
  caption: string;
  ariaLabel: string;
  columns: readonly ColumnDef<T>[];
  actions: readonly RowAction<T>[];
  pageSizes: readonly number[];
  page: Ref<number>;
  pageSize: Ref<number>;
  search: Ref<string>;
  sort: Ref<SortState>;
  rowId: (row: T) => string;

  pageRows: ComputedRef<readonly T[]>;
  totalRows: ComputedRef<number>;
  totalPages: ComputedRef<number>;

  setSort: (colId: string) => void;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
}>;

const clamp = (n: number, min: number, max: number) =>
  n < min ? min : n > max ? max : n;

const valOf = <T>(row: T, col: ColumnDef<T>): unknown =>
  typeof col.accessor === "function"
    ? col.accessor(row)
    : (row as any)[col.accessor];

const toSearch = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

const defaultCmp = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number")
    return a === b ? 0 : a < b ? -1 : 1;
  if (
    typeof a === "string" &&
    typeof b === "string" &&
    DateValidator.isIso(a) &&
    DateValidator.isIso(b)
  )
    return DateValidator.compareIso(a, b);

  const sa = typeof a === "string" ? a : String(a);
  const sb = typeof b === "string" ? b : String(b);
  return sa.localeCompare(sb, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export default function useDataTable<T>(cfg: TableConfig<T>): Vm<T> {
  const page = ref(1);
  const pageSizes = cfg.pageSizes?.length ? cfg.pageSizes : [10, 20, 50];
  const pageSize = ref(
    cfg.initialPageSize && pageSizes.includes(cfg.initialPageSize)
      ? cfg.initialPageSize
      : pageSizes[0],
  );
  const search = ref("");
  const sort = ref<SortState>({ colId: null, dir: "asc" });

  const searchableCols = computed(() =>
    cfg.columns.filter((c) =>
      typeof c.searchable === "boolean" ? c.searchable : true,
    ),
  );

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return cfg.rows.value;

    const cols = searchableCols.value;
    return cfg.rows.value.filter((r) => {
      for (const c of cols) {
        const s = toSearch(valOf(r, c)).toLowerCase();
        if (s.includes(q)) return true;
      }
      return false;
    });
  });

  const sorted = computed(() => {
    const colId = sort.value.colId;
    if (!colId) return filtered.value;

    const col = cfg.columns.find((c) => c.id === colId);
    if (!col || !col.sortable) return filtered.value;

    const dir = sort.value.dir === "asc" ? 1 : -1;
    const fn =
      typeof col.sortable === "function" ? (col.sortable as any) : defaultCmp;

    const arr = filtered.value.map((r, i) => ({ r, i }));
    arr.sort((x, y) => {
      try {
        const c = fn(valOf(x.r, col), valOf(y.r, col));
        return c !== 0 ? c * dir : x.i - y.i;
      } catch {
        return x.i - y.i;
      }
    });

    return arr.map((x) => x.r);
  });

  const totalRows = computed(() => sorted.value.length);

  const totalPages = computed(() => {
    const n = Math.ceil(totalRows.value / pageSize.value);
    return n >= 1 ? n : 1;
  });

  const pageRows = computed(() => {
    page.value = clamp(page.value, 1, totalPages.value);

    const start = (page.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return sorted.value.slice(start, end);
  });

  const setSort = (colId: string) => {
    const col = cfg.columns.find((c) => c.id === colId);
    if (!col || !col.sortable) return;

    sort.value =
      sort.value.colId !== colId
        ? { colId, dir: "asc" }
        : { colId, dir: sort.value.dir === "asc" ? "desc" : "asc" };

    page.value = 1;
  };

  const setPage = (p: number) => (page.value = clamp(p, 1, totalPages.value));
  const setPageSize = (n: number) => ((pageSize.value = n), (page.value = 1));

  return {
    caption: cfg.caption,
    ariaLabel: cfg.ariaLabel,
    columns: cfg.columns,
    actions: cfg.actions?.length ? cfg.actions : [],
    pageSizes,
    page,
    pageSize,
    search,
    sort,
    rowId: cfg.rowId,

    pageRows,
    totalRows,
    totalPages,

    setSort,
    setPage,
    setPageSize,
  };
}
