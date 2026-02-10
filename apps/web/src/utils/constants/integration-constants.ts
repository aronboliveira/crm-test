/**
 * @fileoverview Integration-specific constants for frontend components.
 * Defines available integrations, their metadata, icons, and configuration.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/integration-constants
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Integration status type */
export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending";

/** Integration category */
export type IntegrationCategory =
  | "helpdesk"
  | "erp"
  | "storage"
  | "email"
  | "calendar"
  | "crm"
  | "communication"
  | "analytics";

/** Integration configuration field type */
export type ConfigFieldType =
  | "text"
  | "password"
  | "url"
  | "email"
  | "number"
  | "select"
  | "checkbox"
  | "textarea";

/** Integration feature definition */
export interface IntegrationFeature {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
}

/** Integration configuration field */
export interface ConfigField {
  readonly key: string;
  readonly label: string;
  readonly type: ConfigFieldType;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly helpText?: string;
  readonly options?: readonly { value: string; label: string }[];
  readonly validation?: {
    readonly pattern?: string;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly min?: number;
    readonly max?: number;
  };
}

/** Integration definition */
export interface IntegrationDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly category: IntegrationCategory;
  readonly icon: string;
  readonly color: string;
  readonly features: readonly IntegrationFeature[];
  readonly configFields: readonly ConfigField[];
  readonly configurable: boolean;
  readonly docsUrl?: string;
  readonly apiVersion?: string;
}

// =============================================================================
// INTEGRATION ICONS (SVG paths)
// =============================================================================

/** SVG icon paths for integrations */
const _INTEGRATION_ICONS = {
  GLPI: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  
  SAT: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  
  NEXTCLOUD: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  
  ZIMBRA: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  
  OUTLOOK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`,
  
  DATABASE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  
  SETTINGS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  
  CHECK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  
  CHEVRON_DOWN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`,
  
  TEST_CONNECTION: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
} as const;

// =============================================================================
// INTEGRATION COLORS
// =============================================================================

/** Brand colors for integrations */
const _INTEGRATION_COLORS = {
  GLPI: "#5cb85c",
  SAT: "#1e88e5",
  NEXTCLOUD: "#0082c9",
  ZIMBRA: "#ff7043",
  OUTLOOK: "#0078d4",
  DEFAULT: "#6c757d",
} as const;

// =============================================================================
// INTEGRATION CATEGORIES
// =============================================================================

/** Integration category definitions */
const _INTEGRATION_CATEGORIES = {
  HELPDESK: {
    id: "helpdesk",
    label: "Helpdesk & Suporte",
    description: "Sistemas de gerenciamento de chamados e tickets",
  },
  ERP: {
    id: "erp",
    label: "ERP & Gestão",
    description: "Sistemas de gestão empresarial",
  },
  STORAGE: {
    id: "storage",
    label: "Armazenamento",
    description: "Serviços de armazenamento e compartilhamento de arquivos",
  },
  EMAIL: {
    id: "email",
    label: "Email",
    description: "Servidores e clientes de email",
  },
  CALENDAR: {
    id: "calendar",
    label: "Calendário",
    description: "Gerenciamento de calendários e eventos",
  },
  CRM: {
    id: "crm",
    label: "CRM",
    description: "Sistemas de gerenciamento de relacionamento com clientes",
  },
  COMMUNICATION: {
    id: "communication",
    label: "Comunicação",
    description: "Ferramentas de comunicação e colaboração",
  },
  ANALYTICS: {
    id: "analytics",
    label: "Analytics",
    description: "Ferramentas de análise e relatórios",
  },
} as const;

// =============================================================================
// STATUS LABELS
// =============================================================================

/** Status label definitions */
const _STATUS_LABELS = {
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Erro",
  pending: "Pendente",
} as const;

// =============================================================================
// INTEGRATION DEFINITIONS
// =============================================================================

/** GLPI integration configuration */
const _GLPI_CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: "apiUrl",
    label: "URL da API",
    type: "url",
    required: true,
    placeholder: "https://glpi.empresa.com.br/apirest.php",
    helpText: "URL completa da API REST do GLPI",
    validation: {
      pattern: "^https?://.*",
    },
  },
  {
    key: "appToken",
    label: "Token da Aplicação",
    type: "password",
    required: true,
    placeholder: "Token de aplicação do GLPI",
    helpText: "Token gerado em Configuração > Geral > API",
  },
  {
    key: "userToken",
    label: "Token do Usuário",
    type: "password",
    required: true,
    placeholder: "Token do usuário para autenticação",
    helpText: "Token disponível nas preferências do usuário",
  },
  {
    key: "syncInterval",
    label: "Intervalo de Sincronização (minutos)",
    type: "number",
    required: false,
    placeholder: "15",
    helpText: "Intervalo entre sincronizações automáticas",
    validation: {
      min: 5,
      max: 1440,
    },
  },
] as const;

const _GLPI_FEATURES: readonly IntegrationFeature[] = [
  {
    key: "tickets",
    label: "Gerenciamento de Tickets",
    description: "Sincronizar e gerenciar tickets do GLPI",
    enabled: true,
  },
  {
    key: "users",
    label: "Sincronização de Usuários",
    description: "Manter usuários sincronizados entre sistemas",
    enabled: true,
  },
  {
    key: "computers",
    label: "Inventário de Computadores",
    description: "Acesso ao inventário de equipamentos",
    enabled: true,
  },
  {
    key: "software",
    label: "Catálogo de Software",
    description: "Acesso ao catálogo de software instalado",
    enabled: true,
  },
] as const;

/** SAT integration configuration */
const _SAT_CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: "apiUrl",
    label: "URL da API",
    type: "url",
    required: true,
    placeholder: "https://api.sat.empresa.com.br",
    helpText: "URL base da API do SAT",
  },
  {
    key: "clientId",
    label: "Client ID",
    type: "text",
    required: true,
    placeholder: "ID do cliente OAuth2",
    helpText: "Identificador da aplicação",
  },
  {
    key: "clientSecret",
    label: "Client Secret",
    type: "password",
    required: true,
    placeholder: "Segredo do cliente OAuth2",
    helpText: "Chave secreta da aplicação",
  },
  {
    key: "companyId",
    label: "ID da Empresa",
    type: "text",
    required: true,
    placeholder: "Código da empresa no SAT",
  },
  {
    key: "syncInvoices",
    label: "Sincronizar Notas Fiscais",
    type: "checkbox",
    required: false,
    helpText: "Habilitar sincronização de NFe e NFSe",
  },
  {
    key: "syncProducts",
    label: "Sincronizar Produtos",
    type: "checkbox",
    required: false,
    helpText: "Manter estoque sincronizado",
  },
] as const;

const _SAT_FEATURES: readonly IntegrationFeature[] = [
  {
    key: "invoices",
    label: "Notas Fiscais",
    description: "Emissão e consulta de NFe/NFSe",
    enabled: true,
  },
  {
    key: "customers",
    label: "Cadastro de Clientes",
    description: "Sincronização bidirecional de clientes",
    enabled: true,
  },
  {
    key: "products",
    label: "Gestão de Produtos",
    description: "Controle de estoque e catálogo",
    enabled: true,
  },
  {
    key: "orders",
    label: "Pedidos",
    description: "Gerenciamento de pedidos de venda",
    enabled: true,
  },
  {
    key: "payments",
    label: "Pagamentos",
    description: "Registro e controle de pagamentos",
    enabled: true,
  },
] as const;

/** NextCloud integration configuration */
const _NEXTCLOUD_CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: "serverUrl",
    label: "URL do Servidor",
    type: "url",
    required: true,
    placeholder: "https://cloud.empresa.com.br",
    helpText: "URL do servidor NextCloud",
  },
  {
    key: "username",
    label: "Usuário",
    type: "text",
    required: true,
    placeholder: "Nome de usuário",
  },
  {
    key: "password",
    label: "Senha ou Token",
    type: "password",
    required: true,
    placeholder: "Senha ou token de aplicação",
    helpText: "Recomendamos usar um token de aplicação",
  },
  {
    key: "basePath",
    label: "Pasta Base",
    type: "text",
    required: false,
    placeholder: "/CRM",
    helpText: "Pasta raiz para arquivos do CRM",
  },
  {
    key: "syncShares",
    label: "Sincronizar Compartilhamentos",
    type: "checkbox",
    required: false,
    helpText: "Manter links de compartilhamento sincronizados",
  },
] as const;

const _NEXTCLOUD_FEATURES: readonly IntegrationFeature[] = [
  {
    key: "files",
    label: "Gerenciamento de Arquivos",
    description: "Upload, download e organização de arquivos",
    enabled: true,
  },
  {
    key: "shares",
    label: "Compartilhamentos",
    description: "Criar e gerenciar links de compartilhamento",
    enabled: true,
  },
  {
    key: "entityFolders",
    label: "Pastas por Entidade",
    description: "Organização automática por projeto/cliente",
    enabled: true,
  },
  {
    key: "activities",
    label: "Feed de Atividades",
    description: "Visualizar atividades e alterações recentes",
    enabled: true,
  },
] as const;

/** Zimbra integration configuration */
const _ZIMBRA_CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: "serverUrl",
    label: "URL do Servidor",
    type: "url",
    required: true,
    placeholder: "https://mail.empresa.com.br",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "usuario@empresa.com.br",
  },
  {
    key: "password",
    label: "Senha",
    type: "password",
    required: true,
  },
  {
    key: "syncCalendar",
    label: "Sincronizar Calendário",
    type: "checkbox",
    required: false,
  },
] as const;

const _ZIMBRA_FEATURES: readonly IntegrationFeature[] = [
  {
    key: "email",
    label: "Email",
    description: "Envio e recebimento de emails",
    enabled: true,
  },
  {
    key: "calendar",
    label: "Calendário",
    description: "Sincronização de eventos e reuniões",
    enabled: true,
  },
  {
    key: "contacts",
    label: "Contatos",
    description: "Acesso à lista de contatos",
    enabled: true,
  },
] as const;

/** Outlook integration configuration */
const _OUTLOOK_CONFIG_FIELDS: readonly ConfigField[] = [
  {
    key: "clientId",
    label: "Client ID (Azure AD)",
    type: "text",
    required: true,
    placeholder: "ID da aplicação Azure AD",
  },
  {
    key: "tenantId",
    label: "Tenant ID",
    type: "text",
    required: true,
    placeholder: "ID do tenant Azure AD",
  },
  {
    key: "clientSecret",
    label: "Client Secret",
    type: "password",
    required: true,
  },
  {
    key: "syncCalendar",
    label: "Sincronizar Calendário",
    type: "checkbox",
    required: false,
  },
] as const;

const _OUTLOOK_FEATURES: readonly IntegrationFeature[] = [
  {
    key: "email",
    label: "Email",
    description: "Integração com Microsoft 365 email",
    enabled: true,
  },
  {
    key: "calendar",
    label: "Calendário",
    description: "Sincronização com Outlook Calendar",
    enabled: true,
  },
  {
    key: "contacts",
    label: "Contatos",
    description: "Acesso aos contatos do Microsoft 365",
    enabled: true,
  },
  {
    key: "onedrive",
    label: "OneDrive",
    description: "Integração com arquivos do OneDrive",
    enabled: false,
  },
] as const;

// =============================================================================
// INTEGRATION REGISTRY
// =============================================================================

/** Complete integration definitions */
const _INTEGRATIONS: Record<string, IntegrationDefinition> = {
  glpi: {
    id: "glpi",
    name: "GLPI",
    description: "Sistema de gerenciamento de chamados e inventário de TI",
    type: "Helpdesk",
    category: "helpdesk",
    icon: "headphones",
    color: _INTEGRATION_COLORS.GLPI,
    features: _GLPI_FEATURES,
    configFields: _GLPI_CONFIG_FIELDS,
    configurable: true,
    docsUrl: "https://glpi-project.org/documentation/",
    apiVersion: "v1",
  },
  sat: {
    id: "sat",
    name: "SAT ERP",
    description: "Sistema de gestão empresarial com emissão de notas fiscais",
    type: "ERP",
    category: "erp",
    icon: "document",
    color: _INTEGRATION_COLORS.SAT,
    features: _SAT_FEATURES,
    configFields: _SAT_CONFIG_FIELDS,
    configurable: true,
    docsUrl: "https://sat.example.com/docs",
    apiVersion: "v2",
  },
  nextcloud: {
    id: "nextcloud",
    name: "NextCloud",
    description: "Plataforma de armazenamento e colaboração em nuvem",
    type: "Armazenamento",
    category: "storage",
    icon: "cloud",
    color: _INTEGRATION_COLORS.NEXTCLOUD,
    features: _NEXTCLOUD_FEATURES,
    configFields: _NEXTCLOUD_CONFIG_FIELDS,
    configurable: true,
    docsUrl: "https://docs.nextcloud.com/",
    apiVersion: "WebDAV/OCS",
  },
  zimbra: {
    id: "zimbra",
    name: "Zimbra",
    description: "Servidor de email e calendário colaborativo",
    type: "Email",
    category: "email",
    icon: "mail",
    color: _INTEGRATION_COLORS.ZIMBRA,
    features: _ZIMBRA_FEATURES,
    configFields: _ZIMBRA_CONFIG_FIELDS,
    configurable: true,
    docsUrl: "https://wiki.zimbra.com/",
    apiVersion: "SOAP/REST",
  },
  outlook: {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Email e calendário do Microsoft 365",
    type: "Email",
    category: "email",
    icon: "calendar",
    color: _INTEGRATION_COLORS.OUTLOOK,
    features: _OUTLOOK_FEATURES,
    configFields: _OUTLOOK_CONFIG_FIELDS,
    configurable: true,
    docsUrl: "https://docs.microsoft.com/graph/",
    apiVersion: "Microsoft Graph",
  },
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen integration icons */
export const INTEGRATION_ICONS: DeepReadonly<typeof _INTEGRATION_ICONS> =
  ObjectDeep.freeze(_INTEGRATION_ICONS);

/** Frozen integration colors */
export const INTEGRATION_COLORS: DeepReadonly<typeof _INTEGRATION_COLORS> =
  ObjectDeep.freeze(_INTEGRATION_COLORS);

/** Frozen integration categories */
export const INTEGRATION_CATEGORIES: DeepReadonly<typeof _INTEGRATION_CATEGORIES> =
  ObjectDeep.freeze(_INTEGRATION_CATEGORIES);

/** Frozen status labels */
export const STATUS_LABELS: DeepReadonly<typeof _STATUS_LABELS> =
  ObjectDeep.freeze(_STATUS_LABELS);

/** Frozen integration definitions */
export const INTEGRATIONS: DeepReadonly<typeof _INTEGRATIONS> =
  ObjectDeep.freeze(_INTEGRATIONS);

/** Frozen GLPI config fields */
export const GLPI_CONFIG_FIELDS: DeepReadonly<typeof _GLPI_CONFIG_FIELDS> =
  ObjectDeep.freeze(_GLPI_CONFIG_FIELDS);

/** Frozen SAT config fields */
export const SAT_CONFIG_FIELDS: DeepReadonly<typeof _SAT_CONFIG_FIELDS> =
  ObjectDeep.freeze(_SAT_CONFIG_FIELDS);

/** Frozen NextCloud config fields */
export const NEXTCLOUD_CONFIG_FIELDS: DeepReadonly<typeof _NEXTCLOUD_CONFIG_FIELDS> =
  ObjectDeep.freeze(_NEXTCLOUD_CONFIG_FIELDS);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get integration definition by ID
 * @param id - Integration identifier
 * @returns Integration definition or undefined
 */
export const getIntegration = (
  id: string
): DeepReadonly<IntegrationDefinition> | undefined => {
  return INTEGRATIONS[id];
};

/**
 * Get all integrations as array
 * @returns Array of integration definitions
 */
export const getAllIntegrations = (): DeepReadonly<IntegrationDefinition>[] => {
  return Object.values(INTEGRATIONS);
};

/**
 * Get integrations by category
 * @param category - Integration category
 * @returns Array of matching integration definitions
 */
export const getIntegrationsByCategory = (
  category: IntegrationCategory
): DeepReadonly<IntegrationDefinition>[] => {
  return Object.values(INTEGRATIONS).filter((i) => i.category === category);
};

/**
 * Get status label for display
 * @param status - Integration status
 * @returns Localized status label
 */
export const getStatusLabel = (status: IntegrationStatus): string => {
  return STATUS_LABELS[status] || "Desconhecido";
};

/**
 * Get icon SVG for integration
 * @param iconKey - Icon key from integration definition
 * @returns SVG string or fallback
 */
export const getIntegrationIcon = (iconKey: string): string => {
  const iconMap: Record<string, keyof typeof _INTEGRATION_ICONS> = {
    headphones: "GLPI",
    document: "SAT",
    cloud: "NEXTCLOUD",
    mail: "ZIMBRA",
    calendar: "OUTLOOK",
    database: "DATABASE",
    settings: "SETTINGS",
  };
  
  const key = iconMap[iconKey] || "SETTINGS";
  return INTEGRATION_ICONS[key] || INTEGRATION_ICONS.SETTINGS;
};

/**
 * Get integration list for select/dropdown
 * @returns Array of id/label pairs
 */
export const getIntegrationOptions = (): { value: string; label: string }[] => {
  return Object.values(INTEGRATIONS).map((i) => ({
    value: i.id,
    label: i.name,
  }));
};

/**
 * Check if integration supports a feature
 * @param integrationId - Integration identifier
 * @param featureKey - Feature key to check
 * @returns True if feature is supported and enabled
 */
export const hasFeature = (
  integrationId: string,
  featureKey: string
): boolean => {
  const integration = INTEGRATIONS[integrationId];
  if (!integration) return false;
  
  const feature = integration.features.find((f) => f.key === featureKey);
  return feature?.enabled ?? false;
};

// =============================================================================
// AGGREGATE EXPORT
// =============================================================================

/** Master integration constants object */
export const INTEGRATION_CONSTANTS = ObjectDeep.freeze({
  icons: INTEGRATION_ICONS,
  colors: INTEGRATION_COLORS,
  categories: INTEGRATION_CATEGORIES,
  statusLabels: STATUS_LABELS,
  integrations: INTEGRATIONS,
} as const);
