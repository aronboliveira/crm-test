/**
 * @fileoverview Reusable CSS / attribute selectors for Cypress specs.
 * Mirrors the frozen constant dictionaries in `src/utils/constants/`.
 * Prefer `data-*` attribute selectors over brittle CSS classes.
 * @module cypress/support/selectors
 */

/* -------------------------------------------------------------------------- */
/*  Auth page selectors                                                       */
/* -------------------------------------------------------------------------- */

/** Selectors for the login page (`/login`) */
export const LOGIN = Object.freeze({
  PAGE: ".auth-page",
  CARD: ".auth-card",
  FORM: ".auth-form",
  EMAIL: 'input[name="email"]',
  PASSWORD: 'input[name="password"]',
  SUBMIT: 'button[type="submit"]',
  TOGGLE_PASSWORD: ".auth-toggle-btn",
  FORGOT_LINK: 'a[href="/forgot-password"]',
  HINT: ".auth-hint",
} as const);

/** Selectors for the forgot-password page */
export const FORGOT_PASSWORD = Object.freeze({
  FORM: ".auth-form",
  EMAIL: 'input[name="email"]',
  SUBMIT: 'button[type="submit"]',
  BACK_LINK: 'a[href="/login"]',
  BACK_BTN: ".btn-ghost",
} as const);

/** Selectors for the reset-password page */
export const RESET_PASSWORD = Object.freeze({
  PAGE: ".auth-page",
  CARD: ".auth-card",
  FORM: 'form[aria-label*="redefinição"], form[aria-label*="reset"]',
  PASSWORD: 'input[name="password"]',
  CONFIRM: 'input[name="confirm"]',
  SUBMIT: 'button[type="submit"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Shell / navigation selectors                                              */
/* -------------------------------------------------------------------------- */

/** Selectors for the app shell and sidebar */
export const SHELL = Object.freeze({
  SIDEBAR: "[data-nav-key], nav, aside",
  SIDEBAR_NAV: 'nav[aria-label], [role="navigation"]',
  HEADER: "header",
  MAIN: 'main, .dashboard-page, [role="main"]',
  /** Get a nav item by key: cy.get(SHELL.navItem('dashboard')) */
  navItem: (key: string) => `[data-nav-key="${key}"]` as const,
} as const);

/* -------------------------------------------------------------------------- */
/*  Dashboard page selectors                                                  */
/* -------------------------------------------------------------------------- */

export const DASHBOARD = Object.freeze({
  PAGE: ".dashboard-page",
  STATS: "#dashboard-stats",
  OVERVIEW_CARDS: "#overview-cards",
} as const);

/* -------------------------------------------------------------------------- */
/*  Data-table selectors (shared across dashboard/admin pages)                */
/* -------------------------------------------------------------------------- */

export const TABLE = Object.freeze({
  CONTAINER: "[data-entity-type], .card",
  SEARCH: "input.table-search-input",
  SORT_SELECT: ".table-sort-select, select.table-search-input",
  ROWS: "tbody tr",
  EXPORT_BTN: 'button[title*="Exportar"]',
  PAGINATION_NEXT: 'button:contains("Próxima"), [aria-label*="próxima"]',
  PAGINATION_PREV: 'button:contains("Anterior"), [aria-label*="anterior"]',
  PAGE_SIZE: "select",
} as const);

/* -------------------------------------------------------------------------- */
/*  Export modal selectors                                                    */
/* -------------------------------------------------------------------------- */

export const EXPORT_MODAL = Object.freeze({
  DIALOG: '[role="dialog"][aria-label*="Exportar"]',
  FORMAT_CSV: 'label:contains("CSV")',
  FORMAT_XLSX: 'label:contains("XLSX")',
  COLUMN_CHECKBOX: 'input[type="checkbox"]',
  CONFIRM: '[role="dialog"] .btn-primary',
  CANCEL: '[role="dialog"] button:contains("Cancelar")',
} as const);

/* -------------------------------------------------------------------------- */
/*  Admin page selectors                                                      */
/* -------------------------------------------------------------------------- */

export const ADMIN_USERS = Object.freeze({
  PAGE: '[aria-label="Gerenciamento de usuários"]',
  SEARCH: "input.table-search-input",
  ROLE_FILTER: "select.table-search-input",
} as const);

export const ADMIN_AUDIT = Object.freeze({
  PAGE: ".audit-page",
  SEARCH: 'input[name="q"]',
  LOCAL_SEARCH: ".audit-filter-input--search",
  KIND_FILTER: 'select[aria-label="Filtrar por tipo"]',
  EXPORT_BTN: 'button[title*="Exportar"]',
  // Date range filters
  DATE_FROM: ".audit-filter-input--date-from",
  DATE_TO: ".audit-filter-input--date-to",
  DATE_PRESET: ".audit-filter-select--date-preset",
  PRESET_TODAY: 'button:contains("Hoje")',
  PRESET_LAST_7: 'button:contains("Últimos 7 dias")',
  PRESET_LAST_30: 'button:contains("Últimos 30 dias")',
  PRESET_THIS_MONTH: 'button:contains("Este mês")',
  // Actor filter
  ACTOR_FILTER: ".audit-filter-input--actor",
  ACTOR_SUGGESTIONS: ".audit-actor-suggestions",
  // Column visibility
  COLUMN_VIS_DROPDOWN: ".audit-column-visibility",
  COLUMN_VIS_TRIGGER: ".audit-column-visibility__trigger",
  COLUMN_VIS_MENU: ".audit-column-visibility__menu",
  COLUMN_CHECKBOX: (col: string) => `input[data-col="${col}"]` as const,
  // Charts
  CHARTS_SECTION: ".audit-charts-section",
  SUCCESS_FAILURE_CHART: "#audit-chart-success-failure",
  HOURLY_ACTIVITY_CHART: "#audit-chart-hourly-activity",
  DONUT_CHART: ".donut-chart",
  BAR_CHART: ".bar-chart",
  // Table
  TABLE_HEADER: "thead th",
  SORTABLE_HEADER: "thead th.sortable",
  SORT_ICON: ".sort-icon",
} as const);

export const ADMIN_MAIL_OUTBOX = Object.freeze({
  PAGE: 'section[aria-label="Caixa de Saída Mock"], .page',
  SEARCH: "input.table-search-input",
  KIND_FILTER: "select.table-search-input",
  EXPORT_BTN: 'button[title*="Exportar"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Devices page selectors                                                    */
/* -------------------------------------------------------------------------- */

export const DEVICES = Object.freeze({
  PAGE: ".devices-page",
  HEADER: ".devices-header",
  STATS: ".devices-stats",
  NAME_INPUT: ".devices-name-input",
  SEARCH: ".devices-smart-input--search",
  STATUS_FILTER:
    'select[aria-label="Filtrar por status"], select.table-search-input:nth-of-type(1)',
  KIND_FILTER:
    'select[aria-label="Filtrar por tipo"], select.table-search-input:nth-of-type(2)',
  CREATE_BTN: "button.btn-primary",
  EXPORT_BTN: ".devices-header__actions button.btn-ghost:last-child",
  CHARTS_SECTION: ".devices-analytics, .devices-stats",
} as const);

/* -------------------------------------------------------------------------- */
/*  Integrations page selectors                                               */
/* -------------------------------------------------------------------------- */

export const INTEGRATIONS = Object.freeze({
  PAGE: ".integrations-page",
  CARD: ".integration-card",
  CARD_BY_KEY: (key: string) => `[data-integration-id="${key}"]` as const,
  CARD_BY_ID: (id: string) => `[data-integration-id="${id}"]` as const,
  STATUS_BADGE: ".status-badge",
  STATUS_CONNECTED: ".status-badge.status-connected",
  STATUS_DISCONNECTED: ".status-badge.status-disconnected",
  STATUS_ERROR: ".status-badge.status-error",
  STATUS_PENDING: ".status-badge.status-pending",
  CONFIG_MODAL: '[role="dialog"]',
  CONFIG_FORM: (id: string) => `form[data-form-id="${id}"]` as const,
  TEST_BTN: '[data-action="test-connection"]',
  HELP_BTN: '[data-action="help"]',
  WHATSAPP_HEALTH_SECTION: ".integration-whatsapp-health",
  WHATSAPP_HEALTH_REFRESH: ".integration-whatsapp-health__header button",
  WHATSAPP_HEALTH_STATUS:
    ".integration-whatsapp-health .glpi-config-help strong",
  WHATSAPP_SYNC_ACTION: ".integration-whatsapp-health__actions .btn",
  /* File import selectors */
  IMPORT_ROW: (id: string) => `[data-import-target="${id}"]` as const,
  IMPORT_INPUT: (id: string) =>
    `[data-testid="${id}-file-import-input"]` as const,
  IMPORT_BTN: ".integration-import-btn",
  IMPORT_LABEL: ".integration-import-label",
  /* Progress popup selectors */
  PROGRESS_POPUP: ".integration-progress-popup",
  PROGRESS_BAR: ".integration-progress-bar",
  PROGRESS_STEP: ".integration-progress-step",
  PROGRESS_STEP_STATE: (state: string) =>
    `.integration-progress-step[data-step-state="${state}"]` as const,
  PROGRESS_SPINNER: ".integration-progress-spinner",
} as const);

/* -------------------------------------------------------------------------- */
/*  Import page selectors                                                     */
/* -------------------------------------------------------------------------- */

export const IMPORT = Object.freeze({
  PAGE: ".import-page",
  FILE_INPUT: 'input[type="file"]',
  SUBMIT: 'button[type="submit"]',
  PREVIEW_TABLE: ".import-preview-table",
  STATUS: "[data-import-status]",
} as const);

/* -------------------------------------------------------------------------- */
/*  Calendar page selectors                                                   */
/* -------------------------------------------------------------------------- */

export const CALENDAR = Object.freeze({
  PAGE: ".cal-page",
  GRID: ".cal-grid",
  EVENT: ".cal-task-chip",
  NAV_PREV: 'button[title*="anterior"], .cal-header button:first-child',
  NAV_NEXT: 'button[title*="próximo"], .cal-header button:last-child',
} as const);

/* -------------------------------------------------------------------------- */
/*  Client profile page selectors                                             */
/* -------------------------------------------------------------------------- */

export const CLIENT_PROFILE = Object.freeze({
  PAGE: ".page-container",
  HEADER: ".page-header",
  TABS: '[role="tablist"]',
  TAB: '[role="tab"]',
  TAB_PANEL: '[role="tabpanel"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Reports page selectors                                                    */
/* -------------------------------------------------------------------------- */

export const REPORTS = Object.freeze({
  PAGE: ".reports-page, .dashboard-reports-page",
  CHART: ".chart-container, canvas, svg",
  EXPORT_BTN: '[data-action="export"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Templates page selectors                                                  */
/* -------------------------------------------------------------------------- */

export const TEMPLATES = Object.freeze({
  PAGE: ".templates-page",
  LIST: ".template-list",
  CARD: ".template-card",
  CREATE_BTN: '[data-action="create-template"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Tasks page selectors                                                      */
/* -------------------------------------------------------------------------- */

export const TASKS = Object.freeze({
  PAGE: ".dt-page",
  SEARCH: "input.table-search-input",
  ROWS: "tbody tr",
  EXPORT_BTN: 'button[title*="Exportar"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Projects page selectors                                                   */
/* -------------------------------------------------------------------------- */

export const PROJECTS = Object.freeze({
  PAGE: ".dp-page",
  SEARCH: "input.table-search-input",
  ROWS: "tbody tr:not(.dp-skeleton-row)",
  CREATE_BTN: "button.btn-primary",
  EXPORT_BTN: 'button[title*="Exportar"]',
  /* Sorting */
  SORT_HEADER: ".dp-th-sortable",
  SORT_ICON: ".dp-sort-icon",
  SORT_ICON_ACTIVE: ".dp-sort-icon--active",
  /* Bulk actions */
  SELECT_ALL: '[data-testid="dp-select-all"]',
  CHECKBOX: ".dp-checkbox",
  BULK_BAR: '[data-testid="dp-bulk-bar"]',
  BULK_DELETE: '[data-testid="dp-bulk-delete"]',
  BULK_STATUS: '[data-testid="dp-bulk-status"]',
  /* Status badges & dropdown */
  STATUS_BADGE: '[data-testid="dp-status-badge"]',
  STATUS_DROPDOWN: '[data-testid="dp-status-dropdown"]',
  STATUS_DROPDOWN_ITEM: ".dp-status-dropdown__item",
  /* Loading skeleton */
  SKELETON_ROW: ".dp-skeleton-row",
} as const);

/* -------------------------------------------------------------------------- */
/*  Leads page selectors                                                      */
/* -------------------------------------------------------------------------- */

export const LEADS = Object.freeze({
  PAGE: ".page-container",
  SEARCH: "input.table-search-input",
  ROWS: "tbody tr",
} as const);

/* -------------------------------------------------------------------------- */
/*  My Work page selectors                                                    */
/* -------------------------------------------------------------------------- */

export const MY_WORK = Object.freeze({
  PAGE: ".mw-page",
  HEADER: ".mw-header",
  SECTIONS: "section",
  TABS: ".mw-tabs",
  EXPORT_BTN: 'button[title*="Exportar"]',
} as const);

/* -------------------------------------------------------------------------- */
/*  Clients page selectors                                                    */
/* -------------------------------------------------------------------------- */

export const CLIENTS = Object.freeze({
  PAGE: ".page-container",
  HEADER: ".page-header",
  SEARCH: "input.table-search-input",
  ROWS: "tbody tr",
  ROW_LINK: "tbody tr a, .client-link",
  EXPORT_BTN: 'button[title*="Exportar"]',
} as const);
