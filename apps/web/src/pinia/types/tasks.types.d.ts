import type { Cursor, TablePrefs } from "./table.types";

export type TaskStatus = "todo" | "doing" | "blocked" | "done" | "archived";
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export type TaskRow = Readonly<{
  id: string;
  projectId: string;
  title: string;
  assigneeEmail: string;
  assigneeId: string | null;
  milestoneId: string | null;
  tags: string[];
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  deadlineAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type TasksState = {
  byId: Record<string, TaskRow>;
  ids: string[];
  loading: boolean;
  error: string | null;
  nextCursor: Cursor;
  prefs: TablePrefs;
};
