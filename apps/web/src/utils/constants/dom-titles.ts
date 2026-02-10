/**
 * @fileoverview Frozen dictionaries for HTML title attributes.
 * Used for consistent tooltip/title text across the application.
 * Supports internationalization patterns.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/dom-titles
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// COMMON ACTION TITLES
// =============================================================================

/** Titles for common actions */
const _ACTION_TITLES = {
  SAVE: "Salvar alterações",
  CANCEL: "Cancelar operação",
  DELETE: "Excluir item",
  EDIT: "Editar item",
  VIEW: "Visualizar detalhes",
  CREATE: "Criar novo item",
  CLOSE: "Fechar",
  OPEN: "Abrir",
  SUBMIT: "Enviar formulário",
  RESET: "Redefinir formulário",
  UNDO: "Desfazer última ação",
  REDO: "Refazer ação desfeita",
  COPY: "Copiar para área de transferência",
  PASTE: "Colar da área de transferência",
  CUT: "Recortar",
  DUPLICATE: "Duplicar item",
  ARCHIVE: "Arquivar item",
  RESTORE: "Restaurar item",
  EXPORT: "Exportar dados",
  IMPORT: "Importar dados",
  DOWNLOAD: "Baixar arquivo",
  UPLOAD: "Enviar arquivo",
  PRINT: "Imprimir",
  SHARE: "Compartilhar",
  REFRESH: "Atualizar dados",
  SEARCH: "Buscar",
  FILTER: "Filtrar resultados",
  SORT: "Ordenar lista",
  EXPAND: "Expandir seção",
  COLLAPSE: "Recolher seção",
  SELECT_ALL: "Selecionar todos",
  DESELECT_ALL: "Desmarcar todos",
  SHOW_MORE: "Mostrar mais",
  SHOW_LESS: "Mostrar menos",
  LOAD_MORE: "Carregar mais",
  BACK: "Voltar",
  FORWARD: "Avançar",
  HOME: "Ir para início",
  HELP: "Ajuda",
  SETTINGS: "Configurações",
  LOGOUT: "Sair do sistema",
} as const;

/** Titles for navigation actions */
const _NAV_TITLES = {
  TOGGLE_SIDEBAR: "Alternar barra lateral",
  OPEN_SIDEBAR: "Abrir barra lateral",
  CLOSE_SIDEBAR: "Fechar barra lateral",
  TOGGLE_MENU: "Alternar menu",
  OPEN_MENU: "Abrir menu",
  CLOSE_MENU: "Fechar menu",
  TOGGLE_SUBMENU: "Alternar submenu",
  GO_TO_DASHBOARD: "Ir para o painel",
  GO_TO_PROJECTS: "Ir para projetos",
  GO_TO_TASKS: "Ir para tarefas",
  GO_TO_LEADS: "Ir para leads",
  GO_TO_CLIENTS: "Ir para clientes",
  GO_TO_CALENDAR: "Ir para calendário",
  GO_TO_REPORTS: "Ir para relatórios",
  GO_TO_SETTINGS: "Ir para configurações",
  GO_TO_PROFILE: "Ir para perfil",
  GO_TO_INTEGRATIONS: "Ir para integrações",
  BREADCRUMB_HOME: "Voltar para página inicial",
  BREADCRUMB_BACK: "Voltar para página anterior",
  SKIP_TO_CONTENT: "Pular para o conteúdo principal",
  SKIP_TO_NAV: "Pular para navegação",
} as const;

// =============================================================================
// INTEGRATION-SPECIFIC TITLES
// =============================================================================

/** Titles for integration components */
const _INTEGRATION_TITLES = {
  // General
  TEST_CONNECTION: "Testar conexão com o serviço",
  CONFIGURE: "Configurar integração",
  SYNC_NOW: "Sincronizar dados agora",
  VIEW_LOGS: "Ver logs de sincronização",
  DISCONNECT: "Desconectar integração",
  RECONNECT: "Reconectar integração",
  REFRESH_STATUS: "Atualizar status da conexão",
  VIEW_DOCS: "Ver documentação",

  // Status indicators
  STATUS_CONNECTED: "Integração conectada e funcionando",
  STATUS_DISCONNECTED: "Integração desconectada",
  STATUS_ERROR: "Erro na integração - clique para detalhes",
  STATUS_PENDING: "Conexão pendente de configuração",
  STATUS_SYNCING: "Sincronização em andamento",

  // GLPI
  GLPI_TITLE: "GLPI - Sistema de gerenciamento de chamados",
  GLPI_TEST: "Testar conexão com GLPI",
  GLPI_SYNC: "Sincronizar tickets e usuários do GLPI",
  GLPI_CONFIG: "Configurar credenciais do GLPI",

  // SAT
  SAT_TITLE: "SAT ERP - Sistema de gestão empresarial",
  SAT_TEST: "Testar conexão com SAT",
  SAT_SYNC: "Sincronizar notas fiscais, clientes e produtos",
  SAT_CONFIG: "Configurar credenciais do SAT",
  SAT_INVOICES: "Gerenciar notas fiscais",
  SAT_CUSTOMERS: "Sincronizar clientes",
  SAT_PRODUCTS: "Sincronizar produtos e estoque",

  // NextCloud
  NEXTCLOUD_TITLE: "NextCloud - Armazenamento e colaboração",
  NEXTCLOUD_TEST: "Testar conexão com NextCloud",
  NEXTCLOUD_SYNC: "Sincronizar arquivos e compartilhamentos",
  NEXTCLOUD_CONFIG: "Configurar credenciais do NextCloud",
  NEXTCLOUD_FILES: "Gerenciar arquivos",
  NEXTCLOUD_SHARES: "Gerenciar compartilhamentos",

  // Zimbra
  ZIMBRA_TITLE: "Zimbra - Servidor de email",
  ZIMBRA_TEST: "Testar conexão com Zimbra",
  ZIMBRA_SYNC: "Sincronizar emails e calendário",
  ZIMBRA_CONFIG: "Configurar conta do Zimbra",

  // Outlook
  OUTLOOK_TITLE: "Microsoft Outlook - Email e calendário",
  OUTLOOK_TEST: "Testar conexão com Outlook",
  OUTLOOK_SYNC: "Sincronizar emails e eventos",
  OUTLOOK_CONFIG: "Configurar conta do Outlook",
} as const;

// =============================================================================
// FORM-SPECIFIC TITLES
// =============================================================================

/** Titles for form elements */
const _FORM_TITLES = {
  // Password fields
  SHOW_PASSWORD: "Mostrar senha",
  HIDE_PASSWORD: "Ocultar senha",
  GENERATE_PASSWORD: "Gerar senha segura",
  COPY_PASSWORD: "Copiar senha",

  // Validation
  FIELD_REQUIRED: "Este campo é obrigatório",
  FIELD_INVALID: "O valor informado é inválido",
  FIELD_TOO_SHORT: "O valor informado é muito curto",
  FIELD_TOO_LONG: "O valor informado é muito longo",

  // File inputs
  SELECT_FILE: "Selecionar arquivo",
  SELECT_FILES: "Selecionar arquivos",
  DRAG_DROP: "Arraste e solte arquivos aqui",
  REMOVE_FILE: "Remover arquivo",
  PREVIEW_FILE: "Visualizar arquivo",

  // Date inputs
  SELECT_DATE: "Selecionar data",
  SELECT_TIME: "Selecionar hora",
  SELECT_DATETIME: "Selecionar data e hora",
  CLEAR_DATE: "Limpar data",
  TODAY: "Selecionar data de hoje",

  // Select/Dropdown
  SELECT_OPTION: "Selecionar opção",
  CLEAR_SELECTION: "Limpar seleção",
  SEARCH_OPTIONS: "Buscar opções",
  NO_OPTIONS: "Nenhuma opção disponível",
  LOADING_OPTIONS: "Carregando opções...",

  // Rich text editor
  BOLD: "Negrito (Ctrl+B)",
  ITALIC: "Itálico (Ctrl+I)",
  UNDERLINE: "Sublinhado (Ctrl+U)",
  STRIKETHROUGH: "Tachado",
  LINK: "Inserir link (Ctrl+K)",
  UNLINK: "Remover link",
  BULLET_LIST: "Lista com marcadores",
  NUMBERED_LIST: "Lista numerada",
  ALIGN_LEFT: "Alinhar à esquerda",
  ALIGN_CENTER: "Centralizar",
  ALIGN_RIGHT: "Alinhar à direita",
  ALIGN_JUSTIFY: "Justificar",
  INSERT_IMAGE: "Inserir imagem",
  INSERT_TABLE: "Inserir tabela",
  CODE_BLOCK: "Bloco de código",
  QUOTE: "Citação",
} as const;

// =============================================================================
// TABLE TITLES
// =============================================================================

/** Titles for table components */
const _TABLE_TITLES = {
  SORT_ASC: "Ordenar em ordem crescente",
  SORT_DESC: "Ordenar em ordem decrescente",
  SORT_NONE: "Remover ordenação",
  FILTER_COLUMN: "Filtrar esta coluna",
  HIDE_COLUMN: "Ocultar coluna",
  SHOW_COLUMN: "Mostrar coluna",
  RESIZE_COLUMN: "Redimensionar coluna",
  PIN_COLUMN: "Fixar coluna",
  UNPIN_COLUMN: "Desfixar coluna",
  SELECT_ROW: "Selecionar linha",
  DESELECT_ROW: "Desmarcar linha",
  EXPAND_ROW: "Expandir linha",
  COLLAPSE_ROW: "Recolher linha",
  EDIT_ROW: "Editar esta linha",
  DELETE_ROW: "Excluir esta linha",
  VIEW_ROW: "Ver detalhes desta linha",
  FIRST_PAGE: "Ir para primeira página",
  PREV_PAGE: "Ir para página anterior",
  NEXT_PAGE: "Ir para próxima página",
  LAST_PAGE: "Ir para última página",
  PAGE_SIZE: "Itens por página",
  TOTAL_ITEMS: "Total de itens",
  SELECTED_ITEMS: "Itens selecionados",
  BULK_DELETE: "Excluir itens selecionados",
  BULK_ARCHIVE: "Arquivar itens selecionados",
  BULK_EXPORT: "Exportar itens selecionados",
} as const;

// =============================================================================
// NOTIFICATION TITLES
// =============================================================================

/** Titles for notifications and alerts */
const _NOTIFICATION_TITLES = {
  DISMISS: "Dispensar notificação",
  DISMISS_ALL: "Dispensar todas as notificações",
  MARK_READ: "Marcar como lida",
  MARK_UNREAD: "Marcar como não lida",
  VIEW_ALL: "Ver todas as notificações",
  CLEAR_ALL: "Limpar todas as notificações",
  NOTIFICATION_SETTINGS: "Configurações de notificação",
  MUTE: "Silenciar notificações",
  UNMUTE: "Reativar notificações",
} as const;

// =============================================================================
// MODAL TITLES
// =============================================================================

/** Titles for modal actions */
const _MODAL_TITLES = {
  CLOSE_MODAL: "Fechar janela",
  MINIMIZE: "Minimizar",
  MAXIMIZE: "Maximizar",
  RESTORE: "Restaurar tamanho",
  DRAG_TO_MOVE: "Arraste para mover",
  RESIZE: "Redimensionar",
  CONFIRM_ACTION: "Confirmar ação",
  CANCEL_ACTION: "Cancelar ação",
} as const;

// =============================================================================
// STATUS TITLES
// =============================================================================

/** Titles for status indicators */
const _STATUS_TITLES = {
  // Project status
  PROJECT_ACTIVE: "Projeto ativo",
  PROJECT_PAUSED: "Projeto pausado",
  PROJECT_COMPLETED: "Projeto concluído",
  PROJECT_CANCELLED: "Projeto cancelado",
  PROJECT_ARCHIVED: "Projeto arquivado",

  // Task status
  TASK_TODO: "Tarefa a fazer",
  TASK_IN_PROGRESS: "Tarefa em andamento",
  TASK_REVIEW: "Tarefa em revisão",
  TASK_DONE: "Tarefa concluída",
  TASK_BLOCKED: "Tarefa bloqueada",

  // Lead status
  LEAD_NEW: "Novo lead",
  LEAD_CONTACTED: "Lead contatado",
  LEAD_QUALIFIED: "Lead qualificado",
  LEAD_PROPOSAL: "Proposta enviada",
  LEAD_NEGOTIATION: "Em negociação",
  LEAD_WON: "Lead convertido",
  LEAD_LOST: "Lead perdido",

  // Priority
  PRIORITY_LOW: "Prioridade baixa",
  PRIORITY_MEDIUM: "Prioridade média",
  PRIORITY_HIGH: "Prioridade alta",
  PRIORITY_URGENT: "Prioridade urgente",

  // User status
  USER_ONLINE: "Usuário online",
  USER_OFFLINE: "Usuário offline",
  USER_AWAY: "Usuário ausente",
  USER_BUSY: "Usuário ocupado",
  USER_DND: "Não perturbe",
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen action titles */
export const ACTION_TITLES: DeepReadonly<typeof _ACTION_TITLES> =
  ObjectDeep.freeze(_ACTION_TITLES);

/** Frozen navigation titles */
export const NAV_TITLES: DeepReadonly<typeof _NAV_TITLES> =
  ObjectDeep.freeze(_NAV_TITLES);

/** Frozen integration titles */
export const INTEGRATION_TITLES: DeepReadonly<typeof _INTEGRATION_TITLES> =
  ObjectDeep.freeze(_INTEGRATION_TITLES);

/** Frozen form titles */
export const FORM_TITLES: DeepReadonly<typeof _FORM_TITLES> =
  ObjectDeep.freeze(_FORM_TITLES);

/** Frozen table titles */
export const TABLE_TITLES: DeepReadonly<typeof _TABLE_TITLES> =
  ObjectDeep.freeze(_TABLE_TITLES);

/** Frozen notification titles */
export const NOTIFICATION_TITLES: DeepReadonly<typeof _NOTIFICATION_TITLES> =
  ObjectDeep.freeze(_NOTIFICATION_TITLES);

/** Frozen modal titles */
export const MODAL_TITLES: DeepReadonly<typeof _MODAL_TITLES> =
  ObjectDeep.freeze(_MODAL_TITLES);

/** Frozen status titles */
export const STATUS_TITLES: DeepReadonly<typeof _STATUS_TITLES> =
  ObjectDeep.freeze(_STATUS_TITLES);

// =============================================================================
// AGGREGATE EXPORTS
// =============================================================================

/** All action-related titles grouped */
export const UI_ACTION_TITLES = ObjectDeep.freeze({
  actions: ACTION_TITLES,
  navigation: NAV_TITLES,
  modals: MODAL_TITLES,
  notifications: NOTIFICATION_TITLES,
} as const);

/** All component-specific titles grouped */
export const COMPONENT_TITLES = ObjectDeep.freeze({
  integrations: INTEGRATION_TITLES,
  forms: FORM_TITLES,
  tables: TABLE_TITLES,
  status: STATUS_TITLES,
} as const);

/** Master dictionary of all title attributes */
export const TITLE_ATTRS = ObjectDeep.freeze({
  ui: UI_ACTION_TITLES,
  components: COMPONENT_TITLES,
} as const);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a dynamic title for integration cards
 */
export const getIntegrationCardTitle = (
  integrationName: string,
  status: string,
): string => {
  const statusLabel =
    status === "connected"
      ? "Conectado"
      : status === "disconnected"
        ? "Desconectado"
        : status === "error"
          ? "Erro"
          : "Pendente";
  return `${integrationName} - ${statusLabel}. Clique para expandir ou recolher`;
};

/**
 * Generate a title for expandable sections
 */
export const getExpandableTitle = (
  sectionName: string,
  isExpanded: boolean,
): string => {
  return `${sectionName} - Clique para ${isExpanded ? "recolher" : "expandir"}`;
};

/**
 * Generate a title for sortable table headers
 */
export const getSortableHeaderTitle = (
  columnName: string,
  currentSort: "asc" | "desc" | "none",
): string => {
  const nextSort =
    currentSort === "none"
      ? "crescente"
      : currentSort === "asc"
        ? "decrescente"
        : "remover ordenação";
  return `${columnName} - Clique para ordenar em ordem ${nextSort}`;
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ActionTitle = (typeof ACTION_TITLES)[keyof typeof ACTION_TITLES];
export type NavTitle = (typeof NAV_TITLES)[keyof typeof NAV_TITLES];
export type IntegrationTitle =
  (typeof INTEGRATION_TITLES)[keyof typeof INTEGRATION_TITLES];
export type FormTitle = (typeof FORM_TITLES)[keyof typeof FORM_TITLES];
export type TableTitle = (typeof TABLE_TITLES)[keyof typeof TABLE_TITLES];
export type NotificationTitle =
  (typeof NOTIFICATION_TITLES)[keyof typeof NOTIFICATION_TITLES];
export type ModalTitle = (typeof MODAL_TITLES)[keyof typeof MODAL_TITLES];
export type StatusTitle = (typeof STATUS_TITLES)[keyof typeof STATUS_TITLES];
