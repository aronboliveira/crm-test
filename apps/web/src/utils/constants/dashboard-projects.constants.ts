import ObjectDeep from "../ObjectDeep";
import type { FilterState } from "../../components/ui/AdvancedFilter.vue";

const _PROJECT_STATUS_OPTIONS = [
  { label: "Planejado", value: "planned" },
  { label: "Ativo", value: "active" },
  { label: "Bloqueado", value: "blocked" },
  { label: "Concluído", value: "done" },
  { label: "Arquivado", value: "archived" },
] as const;

const _PROJECT_STATUS_LABEL_BY_ID: Record<string, string> = {
  planned: "Planejado",
  active: "Ativo",
  blocked: "Bloqueado",
  done: "Concluído",
  archived: "Arquivado",
};

const _PROJECT_FILTER_DEFAULTS: FilterState = {
  status: "",
  priority: "",
  assignee: "",
  tag: "",
  dueBefore: "",
  dueAfter: "",
};

export const PROJECTS_EMPTY_VALUE_LABEL = "—";
export const PROJECTS_EMPTY_DATE_LABEL = "—";

export const PROJECT_STATUS_OPTIONS = ObjectDeep.freeze(_PROJECT_STATUS_OPTIONS);
export const PROJECT_STATUS_LABEL_BY_ID = ObjectDeep.freeze(
  _PROJECT_STATUS_LABEL_BY_ID,
);
export const PROJECT_FILTER_DEFAULTS = ObjectDeep.freeze(
  _PROJECT_FILTER_DEFAULTS,
);
