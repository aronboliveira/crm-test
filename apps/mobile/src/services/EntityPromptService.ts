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
      title: "Novo Projeto",
      confirmText: "Criar",
      fields: [
        {
          key: "name",
          label: "Nome",
          type: "text",
          required: true,
          placeholder: "Nome do projeto",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { label: "ativo", value: "active" },
            { label: "arquivado", value: "archived" },
          ],
        },
        {
          key: "description",
          label: "Descrição",
          type: "textarea",
          placeholder: "Opcional",
        },
      ],
      initial: { status: "active" as const },
      validate: (x) => {
        const name = String(x.name || "").trim();
        if (!name) return "Nome é obrigatório";
        return null;
      },
    });

    if (!v) return false;

    try {
      const description = String(v.description || "").trim();
      const dto: ProjectCreateDTO = {
        name: String(v.name).trim(),
        status: v.status === "archived" ? "archived" : "active",
      };

      if (description) {
        (dto as { description?: string }).description = description;
      }

      await ApiClientService.projects.create(dto as any);
      await AlertService.success("Projeto criado");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Falha ao criar projeto", e);
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
      title: "Nova Tarefa",
      confirmText: "Criar",
      fields: [
        {
          key: "projectId",
          label: "Projeto",
          type: "select",
          required: true,
          options: projectOptions,
        },
        {
          key: "title",
          label: "Título",
          type: "text",
          required: true,
          placeholder: "Título da tarefa",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { label: "a fazer", value: "todo" },
            { label: "em andamento", value: "doing" },
            { label: "concluída", value: "done" },
          ],
        },
        {
          key: "priority",
          label: "Prioridade",
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
          label: "Data de vencimento",
          type: "date",
          placeholder: "AAAA-MM-DD (opcional)",
        },
      ],
      initial: { status: "todo", priority: "3" },
      validate: (x) => {
        const pid = String(x.projectId || "").trim();
        const title = String(x.title || "").trim();
        if (!pid) return "Projeto é obrigatório";
        if (!title) return "Título é obrigatório";

        const dueRaw = String(x.dueAt || "").trim();
        if (dueRaw) {
          // Convert YYYY-MM-DD -> ISO (midnight UTC) and validate iso
          const iso = new Date(dueRaw).toISOString();
          if (!DateValidator.isIso(iso)) return "Data de vencimento inválida";
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
      };

      if (dueIso && DateValidator.isIso(dueIso)) {
        (dto as { dueAt?: string }).dueAt = dueIso;
      }

      await ApiClientService.tasks.create(dto as any);
      await AlertService.success("Tarefa criada");
      return true;
    } catch (e) {
      await AlertService.error("Falha ao criar tarefa", e);
      return false;
    }
  }

  static async confirmDeleteProject(
    id: string,
    name: string,
  ): Promise<boolean> {
    const ok = await PromptBridge.api().confirm({
      title: "Excluir projeto?",
      message: `Isso irá excluir "${name}".`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });

    if (!ok) return false;

    try {
      await ApiClientService.projects.remove(id);
      await AlertService.success("Projeto excluído");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Falha ao excluir projeto", e);
      return false;
    }
  }

  static async confirmDeleteTask(id: string, title: string): Promise<boolean> {
    const ok = await PromptBridge.api().confirm({
      title: "Excluir tarefa?",
      message: `Isso irá excluir "${title}".`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });

    if (!ok) return false;

    try {
      await ApiClientService.tasks.remove(id);
      await AlertService.success("Tarefa excluída");
      return true;
    } catch (e) {
      await AlertService.error("Falha ao excluir tarefa", e);
      return false;
    }
  }

  static async saveProject(id: string, dto: any): Promise<boolean> {
    try {
      await ApiClientService.projects.update(id, dto);
      await AlertService.success("Projeto atualizado");
      ProjectsOptionsService.bust();
      return true;
    } catch (e) {
      await AlertService.error("Falha ao atualizar projeto", e);
      return false;
    }
  }

  static async saveTask(id: string, dto: any): Promise<boolean> {
    try {
      await ApiClientService.tasks.update(id, dto);
      await AlertService.success("Tarefa atualizada");
      return true;
    } catch (e) {
      await AlertService.error("Falha ao atualizar tarefa", e);
      return false;
    }
  }
}
