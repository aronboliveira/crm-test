import type { Cursor, TablePrefs } from "./table.types";

export type ProjectStatus =
  | "planned"
  | "active"
  | "blocked"
  | "done"
  | "archived";

export type ProjectRow = Readonly<{
  id: string;
  code: string;
  name: string;
  ownerEmail: string;
  status: ProjectStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ProjectsState = {
  byId: Record<string, ProjectRow>;
  ids: string[];
  loading: boolean;
  error: string | null;
  nextCursor: Cursor;
  prefs: TablePrefs;
};
