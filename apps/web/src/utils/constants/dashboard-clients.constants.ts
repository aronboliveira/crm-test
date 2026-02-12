import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";
import type { DashboardClientsExportColumnKey } from "../export";

export type ClientLifecycleStage =
  | "Prospect"
  | "Ativo"
  | "Expansão"
  | "Em Risco"
  | "Inativo";

export interface DashboardClientsExportPalette {
  readonly headerFill: string;
  readonly headerFont: string;
  readonly cellText: string;
  readonly mutedText: string;
  readonly border: string;
  readonly zebraOdd: string;
  readonly zebraEven: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentSubtle: string;
}

const _LIFECYCLE_SORT_ORDER: Record<ClientLifecycleStage, number> = {
  Prospect: 1,
  Ativo: 2,
  "Expansão": 3,
  "Em Risco": 4,
  Inativo: 5,
};

const _LIFECYCLE_CLASS_BY_STAGE: Record<ClientLifecycleStage, string> = {
  Prospect: "prospect",
  Ativo: "active",
  "Expansão": "expansion",
  "Em Risco": "risk",
  Inativo: "inactive",
};

const _DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES = [
  "Prospect",
  "Ativo",
  "Expansão",
  "Em Risco",
  "Inativo",
] as const;

const _DASHBOARD_CLIENTS_EXPORT_COLUMN_WIDTH_BY_KEY: Record<
  DashboardClientsExportColumnKey,
  number
> = {
  nome: 30,
  tipo: 14,
  empresa: 24,
  cnpj: 20,
  cep: 12,
  lifecycle: 16,
  email: 40,
  telefone: 20,
  whatsapp: 26,
  whatsappEngagement: 20,
  emailEngagement: 18,
  projetos: 12,
};

const _DASHBOARD_CLIENTS_EXPORT_COLORS: DashboardClientsExportPalette = {
  headerFill: "FF334155",
  headerFont: "FFF8FAFC",
  cellText: "FF0F172A",
  mutedText: "FF64748B",
  border: "FFEEF2F7",
  zebraOdd: "FFFFFFFF",
  zebraEven: "FFFAFCFF",
  accent: "FF1D4ED8",
  accentSoft: "FFEAF2FF",
  accentSubtle: "FFF5F8FF",
};

const _WHATSAPP_ENGAGEMENT_WEIGHTS = {
  delivered: 20,
  read: 40,
  replied: 40,
} as const;

const _EMAIL_ENGAGEMENT_WEIGHTS = {
  opened: 30,
  clicked: 30,
  replied: 40,
} as const;

export const CLIENT_LIFECYCLE_INACTIVE_MAX_ENGAGEMENT = 25;
export const CLIENT_LIFECYCLE_INACTIVE_MIN_AGE_DAYS = 120;
export const CLIENT_LIFECYCLE_EXPANSION_MIN_PROJECTS = 3;
export const CLIENT_LIFECYCLE_EXPANSION_MIN_ENGAGEMENT = 65;
export const CLIENT_LIFECYCLE_RISK_MAX_ENGAGEMENT = 35;
export const CLIENTS_LIFECYCLE_UNKNOWN_LABEL = "Inativo";

export const LIFECYCLE_SORT_ORDER = ObjectDeep.freeze(_LIFECYCLE_SORT_ORDER);
export const LIFECYCLE_CLASS_BY_STAGE = ObjectDeep.freeze(
  _LIFECYCLE_CLASS_BY_STAGE,
);
export const DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES = ObjectDeep.freeze(
  _DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES,
);
export const DASHBOARD_CLIENTS_EXPORT_COLUMN_WIDTH_BY_KEY = ObjectDeep.freeze(
  _DASHBOARD_CLIENTS_EXPORT_COLUMN_WIDTH_BY_KEY,
);
export const DASHBOARD_CLIENTS_EXPORT_COLORS = ObjectDeep.freeze(
  _DASHBOARD_CLIENTS_EXPORT_COLORS,
);
export const WHATSAPP_ENGAGEMENT_WEIGHTS = ObjectDeep.freeze(
  _WHATSAPP_ENGAGEMENT_WEIGHTS,
);
export const EMAIL_ENGAGEMENT_WEIGHTS = ObjectDeep.freeze(
  _EMAIL_ENGAGEMENT_WEIGHTS,
);

export type DashboardClientsLifecycleStageList = DeepReadonly<
  typeof DASHBOARD_CLIENTS_EXPORT_LIFECYCLE_STAGES
>;
