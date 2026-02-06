import type { Ref } from "vue";

export type SortDir = "asc" | "desc";

export type AccessorKey<T> = Extract<keyof T, string>;
export type AccessorFn<T, V> = (row: T) => V;
export type Accessor<T> = AccessorKey<T> | AccessorFn<T, any>;

export type AccessorValue<T, A> =
  A extends AccessorKey<T>
    ? T[A]
    : A extends AccessorFn<T, infer V>
      ? V
      : never;

export type SortFn<V> = (a: V, b: V) => number;

export type CellCtx<T, A extends Accessor<T>> = Readonly<{
  row: T;
  value: AccessorValue<T, A>;
}>;

export type ColumnDef<T, A extends Accessor<T> = Accessor<T>> = Readonly<{
  id: string;
  header: string;
  ariaHeader?: string;
  accessor: A;
  align?: "left" | "center" | "right";
  width?: string;
  searchable?: boolean;
  sortable?: boolean | SortFn<AccessorValue<T, A>>;
  cell?: (ctx: CellCtx<T, A>) => string;
}>;

export type RowAction<T> = Readonly<{
  id: string;
  label: string;
  ariaLabel: string | ((row: T) => string);
  onClick: (row: T) => void;
  visible?: (row: T) => boolean;
}>;

export type TableConfig<T> = Readonly<{
  rows: Ref<readonly T[]>;
  columns: readonly ColumnDef<T>[];
  caption: string;
  ariaLabel: string;
  rowId: (row: T) => string;
  actions?: readonly RowAction<T>[];
  pageSizes?: readonly number[];
  initialPageSize?: number;
}>;
