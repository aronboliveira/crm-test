export type SortDir = "asc" | "desc";
export type Cursor = string | null;

export type TablePrefs = Readonly<{
  pageSize: number;
  sortBy: string;
  sortDir: SortDir;
  dense: boolean;
}>;
