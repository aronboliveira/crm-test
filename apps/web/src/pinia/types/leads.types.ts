export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "social"
  | "email_campaign"
  | "cold_call"
  | "event"
  | "partner"
  | "other";

export interface CampaignRef {
  id: string;
  name: string;
  channel: string;
  attachedAt: string;
}

export interface ContractRef {
  id: string;
  title: string;
  value?: number;
  attachedAt: string;
}

export interface CtaSuggestion {
  id: string;
  channel: "email" | "whatsapp" | "sms" | "linkedin" | "call";
  message: string;
  createdAt: string;
  used: boolean;
}

export interface LeadRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  assignedTo?: string;
  estimatedValue?: number;
  notes?: string;
  tags?: string[];
  campaigns?: CampaignRef[];
  contracts?: ContractRef[];
  ctaSuggestions?: CtaSuggestion[];
  lastContactAt?: string;
  convertedClientId?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  referral: "Indicação",
  social: "Redes Sociais",
  email_campaign: "Campanha de E-mail",
  cold_call: "Cold Call",
  event: "Evento",
  partner: "Parceiro",
  other: "Outro",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
