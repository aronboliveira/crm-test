import ObjectDeep from "../ObjectDeep";
import type { FilterState } from "../../components/ui/AdvancedFilter.vue";

export type TaskViewMode = "table" | "kanban";

const _TASK_STATUS_OPTIONS = [
  { label: "A Fazer", value: "todo" },
  { label: "Em Progresso", value: "doing" },
  { label: "Concluído", value: "done" },
  { label: "Bloqueado", value: "blocked" },
] as const;

const _TASK_PRIORITY_OPTIONS = [
  { label: "P1 — Crítica", value: "1" },
  { label: "P2 — Alta", value: "2" },
  { label: "P3 — Média", value: "3" },
  { label: "P4 — Baixa", value: "4" },
  { label: "P5 — Mínima", value: "5" },
] as const;

const _TASK_STATUS_LABEL_BY_ID: Record<string, string> = {
  todo: "A Fazer",
  doing: "Em Progresso",
  blocked: "Bloqueado",
  done: "Concluído",
  archived: "Arquivado",
};

const _TASK_FILTER_DEFAULTS: FilterState = {
  status: "",
  priority: "",
  assignee: "",
  tag: "",
  dueBefore: "",
  dueAfter: "",
};

export const TASKS_VIEW_MODE_STORAGE_KEY = "tasks_view_mode";
export const TASKS_DEFAULT_VIEW_MODE: TaskViewMode = "table";
export const TASKS_EMPTY_DATE_LABEL = "—";
export const TASKS_EMPTY_VALUE_LABEL = "—";

export const TASK_STATUS_OPTIONS = ObjectDeep.freeze(_TASK_STATUS_OPTIONS);
export const TASK_PRIORITY_OPTIONS = ObjectDeep.freeze(_TASK_PRIORITY_OPTIONS);
export const TASK_STATUS_LABEL_BY_ID = ObjectDeep.freeze(_TASK_STATUS_LABEL_BY_ID);
export const TASK_FILTER_DEFAULTS = ObjectDeep.freeze(_TASK_FILTER_DEFAULTS);
