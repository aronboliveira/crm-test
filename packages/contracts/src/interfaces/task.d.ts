import type { ProjectId, TaskId } from "../types/ids.d.ts";

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  description?: string;
  status: "todo" | "doing" | "done" | "blocked";
  priority: 1 | 2 | 3 | 4 | 5;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}
