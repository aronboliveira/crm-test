import { computed, onMounted, ref } from "vue";
import { DOMValidator } from "@corp/foundations";
import type {
  ColumnDef,
  RowAction,
} from "../../../components/tables/dataTable.types";

type AnyVm = Readonly<{
  caption: string;
  ariaLabel: string;
  columns: readonly ColumnDef<any>[];
  actions: readonly RowAction<any>[];
  pageSizes: readonly number[];
  page: { value: number };
  pageSize: { value: number };
  search: { value: string };
  sort: { value: { colId: string | null; dir: "asc" | "desc" } };
  rowId: (row: any) => string;

  pageRows: { value: readonly any[] };
  totalRows: { value: number };
  totalPages: { value: number };

  setSort: (colId: string) => void;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
}>;

export type { AnyVm as DataTableVm };

export interface DataTableProps {
  table: AnyVm;
}

export function useDataTableComponent(props: DataTableProps) {
  const wrap = ref<HTMLElement | null>(null);

  const hasActions = computed(() =>
    props.table.actions?.length ? true : false,
  );

  const ariaSort = (colId: string): "none" | "ascending" | "descending" => {
    const s = props.table.sort.value;
    return s.colId !== colId
      ? "none"
      : s.dir === "asc"
        ? "ascending"
        : "descending";
  };

  const cellText = (row: any, col: ColumnDef<any>): string => {
    try {
      const v =
        typeof col.accessor === "function"
          ? col.accessor(row)
          : row[col.accessor as any];
      return col.cell
        ? col.cell({ row, value: v })
        : v == null
          ? ""
          : String(v);
    } catch (e) {
      console.error("[DataTable] cellText failed:", e);
      return "";
    }
  };

  const actionAria = (a: RowAction<any>, row: any) =>
    typeof a.ariaLabel === "function" ? a.ariaLabel(row) : a.ariaLabel;

  onMounted(() => {
    if (!wrap.value) return;
    DOMValidator.ensureFlag(wrap.value, "data-table-wired");
    DOMValidator.ensureAttr(wrap.value, "tabindex", "0");
  });

  return { wrap, hasActions, ariaSort, cellText, actionAria };
}
