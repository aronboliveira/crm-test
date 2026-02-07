import ApiClientService from "./ApiClientService";
import AlertService from "./AlertService";
import ProjectsOptionsService from "./ProjectsOptionsService";
import PromptBridge from "./PromptBridge";
import { DateValidator } from "@corp/foundations";

type ProjectCreateDTO = Readonly<{
  name: string;
  status: "active" | "archived";
  description?: string;
}>;

type TaskCreateDTO = Readonly<{
  projectId: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: 1 | 2 | 3 | 4 | 5;
  dueAt?: string;
}>;

export default class EntityPromptService {
  static async createProject(): Promise<boolean> {
    const v = await PromptBridge.api().form<ProjectCreateDTO>({
      title: "New Project",
      confirmText: "Create",
      fields: [
        {
          key: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "Project name",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { label: "active", value: "active" },
            { label: "archived", value: "archived" },
          ],
        },
        {
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional",
        },
      ],
      initial: { status: "active" as const },
      validate: (x) => {
        const name = String(x.name || "").trim();
        if (!name) return "Name is required";
        return null;
      },
    });

    if (!v) return false;

    try {
      const dto: ProjectCreateDTO = {
        name: String(v.name).trim(),
        status: v.status === "archived" ? "archived" : "active",
        description: String(v.description || "").trim() || undefined,
      };

      await ApiClientService.projects.create(dto as any);
      await AlertService.success("Project created");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Failed to create project", e);
      return false;
    }
  }

  static async createTask(): Promise<boolean> {
    const opts = await ProjectsOptionsService.active();
    const projectOptions = (opts || []).map((o) => ({
      label: String(o.name || "Unnamed"),
      value: String(o.id || ""),
    }));

    const v = await PromptBridge.api().form<Record<string, any>>({
      title: "New Task",
      confirmText: "Create",
      fields: [
        {
          key: "projectId",
          label: "Project",
          type: "select",
          required: true,
          options: projectOptions,
        },
        {
          key: "title",
          label: "Title",
          type: "text",
          required: true,
          placeholder: "Task title",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { label: "todo", value: "todo" },
            { label: "doing", value: "doing" },
            { label: "done", value: "done" },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          required: true,
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
            { label: "5", value: "5" },
          ],
        },
        {
          key: "dueAt",
          label: "Due date",
          type: "date",
          placeholder: "YYYY-MM-DD (optional)",
        },
      ],
      initial: { status: "todo", priority: "3" },
      validate: (x) => {
        const pid = String(x.projectId || "").trim();
        const title = String(x.title || "").trim();
        if (!pid) return "Project is required";
        if (!title) return "Title is required";

        const dueRaw = String(x.dueAt || "").trim();
        if (dueRaw) {
          // Convert YYYY-MM-DD -> ISO (midnight UTC) and validate iso
          const iso = new Date(dueRaw).toISOString();
          if (!DateValidator.isIso(iso)) return "Invalid due date";
        }
        return null;
      },
    });

    if (!v) return false;

    try {
      const pr = Number(String(v.priority || "3"));
      const priority = (pr >= 1 && pr <= 5 ? pr : 3) as 1 | 2 | 3 | 4 | 5;

      const dueRaw = String(v.dueAt || "").trim();
      const dueIso = dueRaw ? new Date(dueRaw).toISOString() : undefined;

      const dto: TaskCreateDTO = {
        projectId: String(v.projectId).trim(),
        title: String(v.title).trim(),
        status:
          v.status === "done"
            ? "done"
            : v.status === "doing"
              ? "doing"
              : "todo",
        priority,
        dueAt: dueIso && DateValidator.isIso(dueIso) ? dueIso : undefined,
      };

      await ApiClientService.tasks.create(dto as any);
      await AlertService.success("Task created");
      return true;
    } catch (e) {
      await AlertService.error("Failed to create task", e);
      return false;
    }
  }

  static async confirmDeleteProject(
    id: string,
    name: string,
  ): Promise<boolean> {
    const ok = await PromptBridge.api().confirm({
      title: "Delete project?",
      message: `This will delete "${name}".`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return false;

    try {
      await ApiClientService.projects.remove(id);
      await AlertService.success("Project deleted");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Failed to delete project", e);
      return false;
    }
  }

  static async confirmDeleteTask(id: string, title: string): Promise<boolean> {
    const ok = await PromptBridge.api().confirm({
      title: "Delete task?",
      message: `This will delete "${title}".`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return false;

    try {
      await ApiClientService.tasks.remove(id);
      await AlertService.success("Task deleted");
      return true;
    } catch (e) {
      await AlertService.error("Failed to delete task", e);
      return false;
    }
  }

  static async saveProject(id: string, dto: any): Promise<boolean> {
    try {
      await ApiClientService.projects.update(id, dto);
      await AlertService.success("Project updated");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Failed to update project", e);
      return false;
    }
  }

  static async saveTask(id: string, dto: any): Promise<boolean> {
    try {
      await ApiClientService.tasks.update(id, dto);
      await AlertService.success("Task updated");
      return true;
    } catch (e) {
      await AlertService.error("Failed to update task", e);
      return false;
    }
  }
}
