import Swal from "sweetalert2";
import ApiClientService from "./ApiClientService";
import AlertService from "./AlertService";
import { DOMValidator, DateValidator } from "@corp/foundations";
import ProjectsOptionsService from "./ProjectsOptionsService";

export default class EntityPromptService {
  static async createProject(): Promise<boolean> {
    const { isConfirmed, value } = await Swal.fire({
      title: "New Project",
      html: EntityPromptService.#projectHtml(),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      preConfirm: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return null;

        const name =
          (
            root.querySelector("[data-id='name']") as HTMLInputElement | null
          )?.value?.trim() ?? "";
        const status =
          (root.querySelector("[data-id='status']") as HTMLSelectElement | null)
            ?.value ?? "active";
        const description =
          (
            root.querySelector(
              "[data-id='description']",
            ) as HTMLTextAreaElement | null
          )?.value?.trim() ?? "";

        return name
          ? { name, status, description: description || undefined }
          : null;
      },
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        root ? EntityPromptService.#a11yForm(root, "New project form") : void 0;
      },
    });

    if (!isConfirmed || !value) return false;

    try {
      await ApiClientService.projects.create(value);
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
    const { isConfirmed, value } = await Swal.fire({
      title: "New Task",
      html: EntityPromptService.#taskHtmlWithProjects(opts),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      preConfirm: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return null;

        const projectId =
          (
            root.querySelector(
              "[data-id='projectId']",
            ) as HTMLInputElement | null
          )?.value?.trim() ?? "";
        const title =
          (
            root.querySelector("[data-id='title']") as HTMLInputElement | null
          )?.value?.trim() ?? "";
        const status =
          (root.querySelector("[data-id='status']") as HTMLSelectElement | null)
            ?.value ?? "todo";
        const priority = Number(
          (
            root.querySelector(
              "[data-id='priority']",
            ) as HTMLSelectElement | null
          )?.value ?? "3",
        );
        const dueAtRaw =
          (root.querySelector("[data-id='dueAt']") as HTMLInputElement | null)
            ?.value ?? "";

        const dueAt = dueAtRaw ? new Date(dueAtRaw).toISOString() : undefined;

        return projectId && title
          ? {
              projectId,
              title,
              status,
              priority:
                priority === 1 ||
                priority === 2 ||
                priority === 3 ||
                priority === 4 ||
                priority === 5
                  ? priority
                  : 3,
              dueAt: dueAt && DateValidator.isIso(dueAt) ? dueAt : undefined,
            }
          : null;
      },
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        root ? EntityPromptService.#a11yForm(root, "New task form") : void 0;
      },
    });

    if (!isConfirmed || !value) return false;

    try {
      await ApiClientService.tasks.create(value);
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
    const { isConfirmed } = await Swal.fire({
      title: "Delete project?",
      text: `This will delete "${name}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return false;

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
    const { isConfirmed } = await Swal.fire({
      title: "Delete task?",
      text: `This will delete "${title}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return false;

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

  static #a11yForm(root: HTMLElement, label: string): void {
    DOMValidator.ensureAttr(root, "role", "form");
    DOMValidator.ensureAttr(root, "aria-label", label);
  }

  static #projectHtml(): string {
    return `
      <div class="grid gap-3" style="text-align:left;">
        <label class="grid gap-1">
          <span style="font-weight:700;">Name</span>
          <input data-id="name" class="swal2-input" autocomplete="off" />
        </label>

        <label class="grid gap-1">
          <span style="font-weight:700;">Status</span>
          <select data-id="status" class="swal2-select">
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label class="grid gap-1">
          <span style="font-weight:700;">Description</span>
          <textarea data-id="description" class="swal2-textarea" rows="4"></textarea>
        </label>
      </div>
    `;
  }

  static #taskHtmlWithProjects(
    opts: readonly { id: string; name: string }[],
  ): string {
    const options = opts
      .map(
        (o) =>
          `<option value="${o.id}">${EntityPromptService.#esc(o.name)}</option>`,
      )
      .join("");

    return `
    <div class="grid gap-3" style="text-align:left;">
      <label class="grid gap-1">
        <span style="font-weight:700;">Project</span>
        <select data-id="projectId" class="swal2-select" aria-label="Project">
          <option value="" disabled selected>Select a project</option>
          ${options}
        </select>
      </label>

      <label class="grid gap-1">
        <span style="font-weight:700;">Title</span>
        <input data-id="title" class="swal2-input" autocomplete="off" aria-label="Task title" />
      </label>

      <!-- keep your status/priority/dueAt blocks -->
    </div>
  `;
  }

  static #esc(s: string): string {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
