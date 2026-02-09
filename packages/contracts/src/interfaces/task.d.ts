import type { ProjectId, TaskId } from "../types/ids.d.ts";

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  description?: string;
  status: "todo" | "doing" | "done" | "blocked";
  priority: 1 | 2 | 3 | 4 | 5;
  subtasks?: Subtask[];
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}
