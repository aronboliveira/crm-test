import type { ProjectId } from "../types/ids.d.ts";

export interface Project {
  id: ProjectId;
  name: string;
  description?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}
