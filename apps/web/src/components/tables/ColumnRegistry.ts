import type { Project, Task } from "@corp/contracts";
import type { ColumnDef, RowAction } from "./dataTable.types";
import { DeepFreeze, DateValidator } from "@corp/foundations";
import DateTimeService from "../../services/DateTimeService";
import DrawerService from "../../services/DrawerService";
import PolicyService from "../../services/PolicyService";
import AppEventsService from "../../services/AppEventService";
import EntityPromptService from "../../services/EntityPromptService";

type Spec<T> = Readonly<{
  columns: readonly ColumnDef<T>[];
  actions: readonly RowAction<T>[];
}>;

const noop = () => void 0;

const editProject: RowAction<Project> = DeepFreeze.apply({
  id: "edit",
  label: "Editar",
  ariaLabel: (p: Project) => `Editar projeto ${p.name}`,
  onClick: (p: Project) => (DrawerService.showProject(p), noop()),
  visible: () => PolicyService.can("projects.write"),
});

const editTask: RowAction<Task> = DeepFreeze.apply({
  id: "edit",
  label: "Editar",
  ariaLabel: (t: Task) => `Editar tarefa ${t.title}`,
  onClick: (t: Task) => (DrawerService.showTask(t), noop()),
  visible: () => PolicyService.can("tasks.write"),
});

const delProject = DeepFreeze.apply({
  id: "delete",
  label: "Excluir",
  ariaLabel: (p: Project) => `Excluir projeto ${p.name}`,
  onClick: async (p: Project) =>
    (await EntityPromptService.confirmDeleteProject(
      String((p as any).id),
      p.name,
    ))
      ? AppEventsService.emit("projects:changed")
      : void 0,
  visible: () => PolicyService.can("projects.manage"),
} satisfies RowAction<Project>);

const delTask = DeepFreeze.apply({
  id: "delete",
  label: "Excluir",
  ariaLabel: (t: Task) => `Excluir tarefa ${t.title}`,
  onClick: async (t: Task) =>
    (await EntityPromptService.confirmDeleteTask(
      String((t as any).id),
      t.title,
    ))
      ? AppEventsService.emit("tasks:changed")
      : void 0,
  visible: () => PolicyService.can("tasks.manage"),
} satisfies RowAction<Task>);

const projectsSpec: Spec<Project> = DeepFreeze.apply({
  columns: [
    {
      id: "name",
      header: "Nome",
      ariaHeader: "Nome do projeto",
      accessor: "name",
      sortable: true,
      searchable: true,
      cell: ({ value }) => String(value ?? ""),
    },
    {
      id: "status",
      header: "Status",
      ariaHeader: "Status do projeto",
      accessor: "status",
      sortable: true,
      searchable: true,
      cell: ({ value }) => String(value ?? ""),
    },
    {
      id: "updatedAt",
      header: "Atualizado",
      ariaHeader: "Data da última atualização",
      accessor: "updatedAt",
      sortable: true,
      searchable: false,
      cell: ({ value }) => DateTimeService.short(value),
    },
  ],
  actions: [editProject, delProject],
});

const tasksSpec: Spec<Task> = DeepFreeze.apply({
  columns: [
    {
      id: "title",
      header: "Título",
      ariaHeader: "Título da tarefa",
      accessor: "title",
      sortable: true,
      searchable: true,
      cell: ({ value }) => String(value ?? ""),
    },
    {
      id: "status",
      header: "Status",
      ariaHeader: "Status da tarefa",
      accessor: "status",
      sortable: true,
      searchable: true,
      cell: ({ value }) => String(value ?? ""),
    },
    {
      id: "priority",
      header: "Prioridade",
      ariaHeader: "Prioridade da tarefa",
      accessor: "priority",
      sortable: true,
      searchable: false,
      cell: ({ value }) => String(value ?? ""),
    },
    {
      id: "dueAt",
      header: "Prazo",
      ariaHeader: "Data de vencimento",
      accessor: (t: Task) => (DateValidator.isIso(t.dueAt) ? t.dueAt : null),
      sortable: (a, b) => DateValidator.compareIso(a, b),
      searchable: false,
      cell: ({ value }) => (value ? DateTimeService.short(value) : "-"),
    },
    {
      id: "updatedAt",
      header: "Atualizado",
      ariaHeader: "Data da última atualização",
      accessor: "updatedAt",
      sortable: true,
      searchable: false,
      cell: ({ value }) => DateTimeService.short(value),
    },
  ],
  actions: [editTask, delTask],
});

export default class ColumnRegistry {
  static projects(): Spec<Project> {
    return projectsSpec;
  }

  static tasks(): Spec<Task> {
    return tasksSpec;
  }
}
