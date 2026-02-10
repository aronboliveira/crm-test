/**
 * @fileoverview Frozen dictionaries for HTML element IDs.
 * Used for consistent ID naming and state tracking across the application.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/dom-ids
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// APPLICATION STRUCTURE IDS
// =============================================================================

/** IDs for main application structure elements */
const _APP_IDS = {
  ROOT: "app",
  ROOT_CONTAINER: "app-container",
  MAIN_CONTENT: "main-content",
  SKIP_LINK_TARGET: "main",
  PAGE_TITLE: "page-title",
  BREADCRUMBS: "breadcrumbs",
  ERROR_BOUNDARY: "error-boundary",
  TOAST_CONTAINER: "toast-container",
  MODAL_ROOT: "modal-root",
  TOOLTIP_ROOT: "tooltip-root",
  POPOVER_ROOT: "popover-root",
  PORTAL_ROOT: "portal-root",
} as const;

/** IDs for navigation components */
const _NAV_IDS = {
  HEADER: "app-header",
  NAVBAR: "main-navbar",
  SIDEBAR: "main-sidebar",
  SIDEBAR_NAV: "sidebar-nav",
  SIDEBAR_TOGGLE: "sidebar-toggle",
  MOBILE_MENU: "mobile-menu",
  MOBILE_MENU_TOGGLE: "mobile-menu-toggle",
  USER_MENU: "user-menu",
  USER_MENU_TOGGLE: "user-menu-toggle",
  NOTIFICATIONS_MENU: "notifications-menu",
  NOTIFICATIONS_TOGGLE: "notifications-toggle",
  SEARCH_BAR: "global-search",
  SEARCH_INPUT: "global-search-input",
  SEARCH_RESULTS: "search-results",
  FOOTER: "app-footer",
} as const;

// =============================================================================
// PAGE-SPECIFIC IDS
// =============================================================================

/** IDs for dashboard page */
const _DASHBOARD_IDS = {
  PAGE: "dashboard-page",
  STATS_SECTION: "dashboard-stats",
  CHART_REVENUE: "chart-revenue",
  CHART_LEADS: "chart-leads",
  CHART_PROJECTS: "chart-projects",
  RECENT_ACTIVITY: "recent-activity",
  QUICK_ACTIONS: "quick-actions",
  OVERVIEW_CARDS: "overview-cards",
  TASK_SUMMARY: "task-summary",
  CALENDAR_WIDGET: "calendar-widget",
} as const;

/** IDs for projects page */
const _PROJECTS_IDS = {
  PAGE: "projects-page",
  LIST: "projects-list",
  GRID: "projects-grid",
  FILTERS: "projects-filters",
  SEARCH: "projects-search",
  SORT_SELECT: "projects-sort",
  CREATE_BTN: "project-create-btn",
  DETAIL_VIEW: "project-detail",
  KANBAN_BOARD: "project-kanban",
  TIMELINE: "project-timeline",
  SETTINGS: "project-settings",
} as const;

/** IDs for tasks page */
const _TASKS_IDS = {
  PAGE: "tasks-page",
  LIST: "tasks-list",
  BOARD: "tasks-board",
  FILTERS: "tasks-filters",
  SEARCH: "tasks-search",
  SORT_SELECT: "tasks-sort",
  CREATE_BTN: "task-create-btn",
  DETAIL_PANEL: "task-detail-panel",
  SUBTASKS: "task-subtasks",
  COMMENTS: "task-comments",
  ATTACHMENTS: "task-attachments",
  CALENDAR: "tasks-calendar",
} as const;

/** IDs for leads page */
const _LEADS_IDS = {
  PAGE: "leads-page",
  LIST: "leads-list",
  PIPELINE: "leads-pipeline",
  FILTERS: "leads-filters",
  SEARCH: "leads-search",
  SORT_SELECT: "leads-sort",
  CREATE_BTN: "lead-create-btn",
  DETAIL_VIEW: "lead-detail",
  CONVERSION_CHART: "lead-conversion-chart",
  SOURCE_CHART: "lead-source-chart",
  IMPORT_BTN: "leads-import-btn",
  EXPORT_BTN: "leads-export-btn",
} as const;

/** IDs for clients page */
const _CLIENTS_IDS = {
  PAGE: "clients-page",
  LIST: "clients-list",
  GRID: "clients-grid",
  FILTERS: "clients-filters",
  SEARCH: "clients-search",
  SORT_SELECT: "clients-sort",
  CREATE_BTN: "client-create-btn",
  DETAIL_VIEW: "client-detail",
  CONTACT_INFO: "client-contact-info",
  PROJECT_HISTORY: "client-project-history",
  INVOICES: "client-invoices",
  NOTES: "client-notes",
} as const;

// =============================================================================
// INTEGRATION IDS
// =============================================================================

/** IDs for integration components */
const _INTEGRATION_IDS = {
  PAGE: "integrations-page",
  LIST: "integrations-list",
  GRID: "integrations-grid",
  FILTERS: "integrations-filters",
  CARD_PREFIX: "integration-card",
  GLPI_CARD: "integration-card-glpi",
  SAT_CARD: "integration-card-sat",
  NEXTCLOUD_CARD: "integration-card-nextcloud",
  ZIMBRA_CARD: "integration-card-zimbra",
  OUTLOOK_CARD: "integration-card-outlook",
  CONFIG_MODAL: "integration-config-modal",
  TEST_MODAL: "integration-test-modal",
  SYNC_STATUS: "integration-sync-status",
  WEBHOOK_CONFIG: "webhook-config",
  API_KEY_INPUT: "integration-api-key",
  URL_INPUT: "integration-url",
  CREDENTIALS_FORM: "integration-credentials-form",
} as const;

/** Function to generate dynamic integration card IDs */
export const getIntegrationCardId = (integrationId: string): string =>
  `${_INTEGRATION_IDS.CARD_PREFIX}-${integrationId}`;

/** Function to generate integration card header ID */
export const getIntegrationHeaderId = (integrationId: string): string =>
  `${getIntegrationCardId(integrationId)}-header`;

/** Function to generate integration card body ID */
export const getIntegrationBodyId = (integrationId: string): string =>
  `${getIntegrationCardId(integrationId)}-body`;

// =============================================================================
// FORM IDS
// =============================================================================

/** IDs for authentication forms */
const _AUTH_IDS = {
  LOGIN_FORM: "login-form",
  LOGIN_EMAIL: "login-email",
  LOGIN_PASSWORD: "login-password",
  LOGIN_REMEMBER: "login-remember",
  LOGIN_SUBMIT: "login-submit",
  REGISTER_FORM: "register-form",
  REGISTER_NAME: "register-name",
  REGISTER_EMAIL: "register-email",
  REGISTER_PASSWORD: "register-password",
  REGISTER_CONFIRM: "register-confirm-password",
  REGISTER_TERMS: "register-terms",
  REGISTER_SUBMIT: "register-submit",
  FORGOT_PASSWORD_FORM: "forgot-password-form",
  FORGOT_EMAIL: "forgot-email",
  RESET_PASSWORD_FORM: "reset-password-form",
  RESET_PASSWORD: "reset-password",
  RESET_CONFIRM: "reset-confirm-password",
  MFA_FORM: "mfa-form",
  MFA_CODE: "mfa-code",
} as const;

/** IDs for entity creation/edit forms */
const _ENTITY_FORM_IDS = {
  PROJECT_FORM: "project-form",
  PROJECT_NAME: "project-name",
  PROJECT_DESC: "project-description",
  PROJECT_STATUS: "project-status",
  PROJECT_DEADLINE: "project-deadline",
  PROJECT_CLIENT: "project-client",
  PROJECT_TEAM: "project-team",
  TASK_FORM: "task-form",
  TASK_TITLE: "task-title",
  TASK_DESC: "task-description",
  TASK_STATUS: "task-status",
  TASK_PRIORITY: "task-priority",
  TASK_ASSIGNEE: "task-assignee",
  TASK_DUE_DATE: "task-due-date",
  TASK_PROJECT: "task-project",
  CLIENT_FORM: "client-form",
  CLIENT_NAME: "client-name",
  CLIENT_EMAIL: "client-email",
  CLIENT_PHONE: "client-phone",
  CLIENT_COMPANY: "client-company",
  CLIENT_ADDRESS: "client-address",
  LEAD_FORM: "lead-form",
  LEAD_NAME: "lead-name",
  LEAD_EMAIL: "lead-email",
  LEAD_PHONE: "lead-phone",
  LEAD_SOURCE: "lead-source",
  LEAD_STATUS: "lead-status",
  LEAD_VALUE: "lead-value",
} as const;

// =============================================================================
// MODAL IDS
// =============================================================================

/** IDs for modal dialogs */
const _MODAL_IDS = {
  CONFIRM_DIALOG: "confirm-dialog",
  CONFIRM_TITLE: "confirm-dialog-title",
  CONFIRM_MESSAGE: "confirm-dialog-message",
  CONFIRM_YES: "confirm-dialog-yes",
  CONFIRM_NO: "confirm-dialog-no",
  ALERT_DIALOG: "alert-dialog",
  FORM_MODAL: "form-modal",
  PREVIEW_MODAL: "preview-modal",
  IMAGE_VIEWER: "image-viewer-modal",
  FILE_UPLOAD: "file-upload-modal",
  SHARE_MODAL: "share-modal",
  SETTINGS_MODAL: "settings-modal",
  HELP_MODAL: "help-modal",
  KEYBOARD_SHORTCUTS: "keyboard-shortcuts-modal",
} as const;

// =============================================================================
// TABLE/LIST IDS
// =============================================================================

/** IDs for data tables */
const _TABLE_IDS = {
  PROJECTS_TABLE: "projects-table",
  TASKS_TABLE: "tasks-table",
  LEADS_TABLE: "leads-table",
  CLIENTS_TABLE: "clients-table",
  USERS_TABLE: "users-table",
  INVOICES_TABLE: "invoices-table",
  ACTIVITIES_TABLE: "activities-table",
  TABLE_HEADER: "table-header",
  TABLE_BODY: "table-body",
  TABLE_FOOTER: "table-footer",
  PAGINATION: "table-pagination",
  PAGE_SIZE_SELECT: "page-size-select",
  BULK_ACTIONS: "bulk-actions",
  SELECT_ALL_CHECKBOX: "select-all",
} as const;

// =============================================================================
// ADMIN IDS
// =============================================================================

/** IDs for admin panel components */
const _ADMIN_IDS = {
  PAGE: "admin-page",
  USERS_SECTION: "admin-users",
  ROLES_SECTION: "admin-roles",
  PERMISSIONS_SECTION: "admin-permissions",
  SETTINGS_SECTION: "admin-settings",
  AUDIT_LOG: "admin-audit-log",
  SYSTEM_INFO: "admin-system-info",
  USER_CREATE_BTN: "admin-user-create",
  ROLE_CREATE_BTN: "admin-role-create",
  BACKUP_BTN: "admin-backup-btn",
  RESTORE_BTN: "admin-restore-btn",
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen application structure IDs */
export const APP_IDS: DeepReadonly<typeof _APP_IDS> = ObjectDeep.freeze(_APP_IDS);

/** Frozen navigation IDs */
export const NAV_IDS: DeepReadonly<typeof _NAV_IDS> = ObjectDeep.freeze(_NAV_IDS);

/** Frozen dashboard IDs */
export const DASHBOARD_IDS: DeepReadonly<typeof _DASHBOARD_IDS> =
  ObjectDeep.freeze(_DASHBOARD_IDS);

/** Frozen projects page IDs */
export const PROJECTS_IDS: DeepReadonly<typeof _PROJECTS_IDS> =
  ObjectDeep.freeze(_PROJECTS_IDS);

/** Frozen tasks page IDs */
export const TASKS_IDS: DeepReadonly<typeof _TASKS_IDS> = ObjectDeep.freeze(_TASKS_IDS);

/** Frozen leads page IDs */
export const LEADS_IDS: DeepReadonly<typeof _LEADS_IDS> = ObjectDeep.freeze(_LEADS_IDS);

/** Frozen clients page IDs */
export const CLIENTS_IDS: DeepReadonly<typeof _CLIENTS_IDS> = ObjectDeep.freeze(_CLIENTS_IDS);

/** Frozen integration IDs */
export const INTEGRATION_IDS: DeepReadonly<typeof _INTEGRATION_IDS> =
  ObjectDeep.freeze(_INTEGRATION_IDS);

/** Frozen authentication form IDs */
export const AUTH_IDS: DeepReadonly<typeof _AUTH_IDS> = ObjectDeep.freeze(_AUTH_IDS);

/** Frozen entity form IDs */
export const ENTITY_FORM_IDS: DeepReadonly<typeof _ENTITY_FORM_IDS> =
  ObjectDeep.freeze(_ENTITY_FORM_IDS);

/** Frozen modal IDs */
export const MODAL_IDS: DeepReadonly<typeof _MODAL_IDS> = ObjectDeep.freeze(_MODAL_IDS);

/** Frozen table IDs */
export const TABLE_IDS: DeepReadonly<typeof _TABLE_IDS> = ObjectDeep.freeze(_TABLE_IDS);

/** Frozen admin panel IDs */
export const ADMIN_IDS: DeepReadonly<typeof _ADMIN_IDS> = ObjectDeep.freeze(_ADMIN_IDS);

// =============================================================================
// AGGREGATE EXPORTS
// =============================================================================

/** All structure-related IDs grouped */
export const STRUCTURE_IDS = ObjectDeep.freeze({
  app: APP_IDS,
  nav: NAV_IDS,
  admin: ADMIN_IDS,
} as const);

/** All page-specific IDs grouped */
export const PAGE_IDS = ObjectDeep.freeze({
  dashboard: DASHBOARD_IDS,
  projects: PROJECTS_IDS,
  tasks: TASKS_IDS,
  leads: LEADS_IDS,
  clients: CLIENTS_IDS,
  integrations: INTEGRATION_IDS,
} as const);

/** All form IDs grouped */
export const FORM_IDS = ObjectDeep.freeze({
  auth: AUTH_IDS,
  entity: ENTITY_FORM_IDS,
} as const);

/** All UI component IDs grouped */
export const UI_IDS = ObjectDeep.freeze({
  modals: MODAL_IDS,
  tables: TABLE_IDS,
} as const);

/** Master dictionary of all element IDs */
export const ELEMENT_IDS = ObjectDeep.freeze({
  structure: STRUCTURE_IDS,
  pages: PAGE_IDS,
  forms: FORM_IDS,
  ui: UI_IDS,
} as const);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AppId = (typeof APP_IDS)[keyof typeof APP_IDS];
export type NavId = (typeof NAV_IDS)[keyof typeof NAV_IDS];
export type DashboardId = (typeof DASHBOARD_IDS)[keyof typeof DASHBOARD_IDS];
export type ProjectsId = (typeof PROJECTS_IDS)[keyof typeof PROJECTS_IDS];
export type TasksId = (typeof TASKS_IDS)[keyof typeof TASKS_IDS];
export type LeadsId = (typeof LEADS_IDS)[keyof typeof LEADS_IDS];
export type ClientsId = (typeof CLIENTS_IDS)[keyof typeof CLIENTS_IDS];
export type IntegrationId = (typeof INTEGRATION_IDS)[keyof typeof INTEGRATION_IDS];
export type AuthId = (typeof AUTH_IDS)[keyof typeof AUTH_IDS];
export type EntityFormId = (typeof ENTITY_FORM_IDS)[keyof typeof ENTITY_FORM_IDS];
export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
export type TableId = (typeof TABLE_IDS)[keyof typeof TABLE_IDS];
export type AdminId = (typeof ADMIN_IDS)[keyof typeof ADMIN_IDS];
