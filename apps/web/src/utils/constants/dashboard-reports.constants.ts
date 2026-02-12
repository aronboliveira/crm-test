import ObjectDeep from "../ObjectDeep";

const _REPORTS_STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  active: "#16a34a",
  blocked: "#ef4444",
  done: "#0ea5e9",
  archived: "#94a3b8",
  todo: "#94a3b8",
  doing: "#0ea5e9",
};

const _REPORTS_STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  active: "Ativo",
  blocked: "Bloqueado",
  done: "Concluído",
  archived: "Arquivado",
  todo: "A Fazer",
  doing: "Em Progresso",
};

const _REPORTS_PRIORITY_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#16a34a",
  5: "#94a3b8",
};

const _REPORTS_PRIORITY_LABELS: Record<number, string> = {
  1: "Crítica",
  2: "Alta",
  3: "Média",
  4: "Baixa",
  5: "Mínima",
};

export const REPORTS_EMPTY_VALUE_LABEL = "—";
export const REPORTS_EMPTY_DATE_LABEL = "—";
export const REPORTS_EXPORT_PROJECT_TYPE_LABEL = "Projeto";
export const REPORTS_EXPORT_TASK_TYPE_LABEL = "Tarefa";
export const REPORTS_ASSIGNEE_UNASSIGNED_LABEL = "Não atribuído";
export const REPORTS_WORKLOAD_BAR_COLOR = "#6366f1";
export const REPORTS_WORKLOAD_LABEL_MAX_LENGTH = 22;
export const REPORTS_DUE_WEEK_WINDOW_DAYS = 7;

export const REPORTS_STATUS_COLORS = ObjectDeep.freeze(_REPORTS_STATUS_COLORS);
export const REPORTS_STATUS_LABELS = ObjectDeep.freeze(_REPORTS_STATUS_LABELS);
export const REPORTS_PRIORITY_COLORS = ObjectDeep.freeze(_REPORTS_PRIORITY_COLORS);
export const REPORTS_PRIORITY_LABELS = ObjectDeep.freeze(_REPORTS_PRIORITY_LABELS);
