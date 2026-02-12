import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

export type MyWorkStatusFilter = "pending" | "done" | "all";
export type MyWorkPriorityFilter = "all" | "critical" | "important" | "normal";
export type MyWorkTaskStatus = "todo" | "doing" | "blocked" | "done" | "archived";
export type MyWorkTaskStatusWithoutArchived = Exclude<
  MyWorkTaskStatus,
  "archived"
>;

export interface MyWorkFilterTab<T extends string> {
  readonly id: T;
  readonly label: string;
}

export interface MyWorkStatusSeriesDefinition {
  readonly status: MyWorkTaskStatusWithoutArchived;
  readonly label: string;
  readonly color: string;
}

export interface MyWorkPrioritySeriesDefinition {
  readonly priority: number;
  readonly label: string;
  readonly color: string;
}

const _MY_WORK_STATUS_TABS: readonly MyWorkFilterTab<MyWorkStatusFilter>[] = [
  { id: "pending", label: "Pendentes" },
  { id: "done", label: "Concluídas" },
  { id: "all", label: "Todas" },
];

const _MY_WORK_PRIORITY_TABS: readonly MyWorkFilterTab<MyWorkPriorityFilter>[] =
  [
    { id: "all", label: "Qualquer Prioridade" },
    { id: "critical", label: "P1/P2" },
    { id: "important", label: "P3" },
    { id: "normal", label: "P4/P5" },
  ];

const _MY_WORK_TASK_STATUS_LABEL_BY_ID: Record<MyWorkTaskStatus, string> = {
  todo: "A Fazer",
  doing: "Em Progresso",
  blocked: "Bloqueado",
  done: "Concluída",
  archived: "Arquivada",
};

const _MY_WORK_STATUS_TONE_CLASS_BY_ID: Record<MyWorkTaskStatus, string> = {
  todo: "mw-status-tone-neutral",
  doing: "mw-status-tone-info",
  blocked: "mw-status-tone-danger",
  done: "mw-status-tone-success",
  archived: "mw-status-tone-neutral",
};

const _MY_WORK_WORKFLOW_SLICE_DEFINITIONS: readonly MyWorkStatusSeriesDefinition[] =
  [
    { status: "done", label: "Concluídas", color: "#22c55e" },
    { status: "doing", label: "Em Progresso", color: "#3b82f6" },
    { status: "todo", label: "A Fazer", color: "#f59e0b" },
    { status: "blocked", label: "Bloqueadas", color: "#ef4444" },
  ];

const _MY_WORK_TASK_STATUS_BAR_DEFINITIONS: readonly MyWorkStatusSeriesDefinition[] =
  [
    { status: "todo", label: "A Fazer", color: "#f59e0b" },
    { status: "doing", label: "Em Progresso", color: "#3b82f6" },
    { status: "blocked", label: "Bloqueadas", color: "#ef4444" },
    { status: "done", label: "Concluídas", color: "#22c55e" },
  ];

const _MY_WORK_PRIORITY_BAR_DEFINITIONS: readonly MyWorkPrioritySeriesDefinition[] =
  [
    { priority: 1, label: "P1", color: "#ef4444" },
    { priority: 2, label: "P2", color: "#f97316" },
    { priority: 3, label: "P3", color: "#f59e0b" },
    { priority: 4, label: "P4", color: "#3b82f6" },
    { priority: 5, label: "P5", color: "#6b7280" },
  ];

const _MY_WORK_CLIENT_ROLE_POOL = [
  "CTO",
  "Tech Lead",
  "Engenheiro Principal",
  "Head de Produto",
  "Arquiteto de Soluções",
  "DevOps Lead",
  "Coordenador Técnico",
] as const;

const _MY_WORK_PROFESSIONAL_ROLE_POOL = [
  "Engenheiro de Software",
  "Arquiteto de Soluções",
  "Tech Lead",
  "Engenheiro DevOps",
  "Analista de Sistemas",
  "Engenheiro de Dados",
] as const;

export const MY_WORK_STATUS_TABS = ObjectDeep.freeze(_MY_WORK_STATUS_TABS);
export const MY_WORK_PRIORITY_TABS = ObjectDeep.freeze(_MY_WORK_PRIORITY_TABS);
export const MY_WORK_TASK_STATUS_LABEL_BY_ID = ObjectDeep.freeze(
  _MY_WORK_TASK_STATUS_LABEL_BY_ID,
);
export const MY_WORK_STATUS_TONE_CLASS_BY_ID = ObjectDeep.freeze(
  _MY_WORK_STATUS_TONE_CLASS_BY_ID,
);
export const MY_WORK_WORKFLOW_SLICE_DEFINITIONS = ObjectDeep.freeze(
  _MY_WORK_WORKFLOW_SLICE_DEFINITIONS,
);
export const MY_WORK_TASK_STATUS_BAR_DEFINITIONS = ObjectDeep.freeze(
  _MY_WORK_TASK_STATUS_BAR_DEFINITIONS,
);
export const MY_WORK_PRIORITY_BAR_DEFINITIONS = ObjectDeep.freeze(
  _MY_WORK_PRIORITY_BAR_DEFINITIONS,
);
export const MY_WORK_CLIENT_ROLE_POOL = ObjectDeep.freeze(
  _MY_WORK_CLIENT_ROLE_POOL,
);
export const MY_WORK_PROFESSIONAL_ROLE_POOL = ObjectDeep.freeze(
  _MY_WORK_PROFESSIONAL_ROLE_POOL,
);

export const MY_WORK_UPCOMING_DEADLINE_WINDOW_DAYS = 7;
export const MY_WORK_PAGINATION_GUARD_LIMIT = 24;
export const MY_WORK_PROJECT_PROGRESS_BAR_COLOR = "#4f46e5";
export const MY_WORK_EMPTY_DUE_LABEL = "Sem prazo";
export const MY_WORK_DEFAULT_TECH_CONTACT_ROLE = "Contato técnico";
export const MY_WORK_UNKNOWN_CLIENT_LABEL = "Unknown";
export const MY_WORK_UNKNOWN_PROJECT_LABEL = "Projeto sem identificacao";
export const MY_WORK_DEFAULT_PROFESSIONAL_ROLE = "Engenheiro de Software";

export type MyWorkRolePool = DeepReadonly<typeof MY_WORK_PROFESSIONAL_ROLE_POOL>;
