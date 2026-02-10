/**
 * @fileoverview Frozen dictionaries for HTML data-* attributes (DOMStringMap).
 * Used for consistent data attribute naming and state tracking across the application.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/dom-data-attrs
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Data attribute key (without 'data-' prefix) */
type DataAttrKey = string;

/** Data attribute value type */
type DataAttrValue = string | number | boolean;

/** Data attribute dictionary */
type DataAttrDict = Readonly<Record<string, DataAttrKey>>;

// =============================================================================
// STATE TRACKING DATA ATTRIBUTES
// =============================================================================

/** Data attributes for component state tracking */
const _STATE_DATA_ATTRS = {
  /** Component loading state: 'loading' | 'loaded' | 'error' | 'idle' */
  LOADING_STATE: "loading-state",
  /** Component visibility state: 'visible' | 'hidden' | 'collapsed' */
  VISIBILITY: "visibility",
  /** Interactive state: 'active' | 'inactive' | 'disabled' */
  ACTIVE: "active",
  /** Selection state: 'selected' | 'unselected' */
  SELECTED: "selected",
  /** Expansion state: 'expanded' | 'collapsed' */
  EXPANDED: "expanded",
  /** Open/closed state: 'open' | 'closed' */
  OPEN: "open",
  /** Focus state: 'focused' | 'blurred' */
  FOCUSED: "focused",
  /** Hover state: 'hovered' | 'idle' */
  HOVERED: "hovered",
  /** Dirty/pristine state: 'dirty' | 'pristine' */
  DIRTY: "dirty",
  /** Touched state: 'touched' | 'untouched' */
  TOUCHED: "touched",
  /** Valid/invalid state: 'valid' | 'invalid' */
  VALID: "valid",
  /** Enabled/disabled state */
  DISABLED: "disabled",
  /** Read-only state */
  READONLY: "readonly",
  /** Dragging state */
  DRAGGING: "dragging",
  /** Dropping state */
  DROPPING: "dropping",
  /** Editing mode state */
  EDITING: "editing",
  /** Animation state: 'entering' | 'leaving' | 'idle' */
  ANIMATING: "animating",
  /** Sync state: 'syncing' | 'synced' | 'error' */
  SYNC_STATE: "sync-state",
} as const;

/** Data attributes for validation tracking */
const _VALIDATION_DATA_ATTRS = {
  /** Validation result: 'valid' | 'invalid' | 'pending' */
  VALIDATION: "validation",
  /** Specific error code */
  ERROR_CODE: "error-code",
  /** Error message key (for i18n) */
  ERROR_MESSAGE: "error-message",
  /** Required field indicator */
  REQUIRED: "required",
  /** Minimum value */
  MIN: "min",
  /** Maximum value */
  MAX: "max",
  /** Minimum length */
  MIN_LENGTH: "min-length",
  /** Maximum length */
  MAX_LENGTH: "max-length",
  /** Pattern for validation */
  PATTERN: "pattern",
  /** Field type for validation */
  VALIDATE_TYPE: "validate-type",
} as const;

// =============================================================================
// ENTITY TRACKING DATA ATTRIBUTES
// =============================================================================

/** Data attributes for entity identification */
const _ENTITY_DATA_ATTRS = {
  /** Entity unique identifier */
  ID: "id",
  /** Entity type (project, task, lead, client, etc.) */
  ENTITY_TYPE: "entity-type",
  /** Entity slug or URL-friendly identifier */
  SLUG: "slug",
  /** Entity version for optimistic locking */
  VERSION: "version",
  /** Entity creation timestamp */
  CREATED_AT: "created-at",
  /** Entity last update timestamp */
  UPDATED_AT: "updated-at",
  /** Entity creator user ID */
  CREATED_BY: "created-by",
  /** Parent entity ID (for hierarchical data) */
  PARENT_ID: "parent-id",
  /** Sort order/position */
  ORDER: "order",
  /** Index in a list */
  INDEX: "index",
} as const;

/** Data attributes for specific entity types */
const _PROJECT_DATA_ATTRS = {
  /** Project identifier */
  PROJECT_ID: "project-id",
  /** Project status */
  PROJECT_STATUS: "project-status",
  /** Project priority */
  PROJECT_PRIORITY: "project-priority",
  /** Project progress percentage */
  PROJECT_PROGRESS: "project-progress",
  /** Project deadline */
  PROJECT_DEADLINE: "project-deadline",
  /** Project client ID */
  PROJECT_CLIENT: "project-client",
} as const;

const _TASK_DATA_ATTRS = {
  /** Task identifier */
  TASK_ID: "task-id",
  /** Task status */
  TASK_STATUS: "task-status",
  /** Task priority */
  TASK_PRIORITY: "task-priority",
  /** Task assignee ID */
  TASK_ASSIGNEE: "task-assignee",
  /** Task due date */
  TASK_DUE: "task-due",
  /** Parent task ID (for subtasks) */
  TASK_PARENT: "task-parent",
  /** Task project ID */
  TASK_PROJECT: "task-project",
  /** Task completion percentage */
  TASK_PROGRESS: "task-progress",
} as const;

const _LEAD_DATA_ATTRS = {
  /** Lead identifier */
  LEAD_ID: "lead-id",
  /** Lead status in pipeline */
  LEAD_STATUS: "lead-status",
  /** Lead source */
  LEAD_SOURCE: "lead-source",
  /** Lead score */
  LEAD_SCORE: "lead-score",
  /** Lead value */
  LEAD_VALUE: "lead-value",
  /** Lead owner ID */
  LEAD_OWNER: "lead-owner",
  /** Pipeline stage */
  LEAD_STAGE: "lead-stage",
} as const;

const _CLIENT_DATA_ATTRS = {
  /** Client identifier */
  CLIENT_ID: "client-id",
  /** Client type (individual, company) */
  CLIENT_TYPE: "client-type",
  /** Client status (active, inactive) */
  CLIENT_STATUS: "client-status",
  /** Client rating */
  CLIENT_RATING: "client-rating",
  /** Client segment */
  CLIENT_SEGMENT: "client-segment",
  /** WhatsApp phone number */
  WHATSAPP_NUMBER: "whatsapp-number",
  /** Is WhatsApp the primary/preferred contact method */
  IS_PRIMARY: "is-primary",
  /** Has WhatsApp verified */
  HAS_WHATSAPP: "has-whatsapp",
  /** Preferred contact method */
  PREFERRED_CONTACT: "preferred-contact",
} as const;

// =============================================================================
// INTEGRATION DATA ATTRIBUTES
// =============================================================================

/** Data attributes for integration components */
const _INTEGRATION_DATA_ATTRS = {
  /** Integration identifier */
  INTEGRATION_ID: "integration-id",
  /** Integration type (glpi, sat, nextcloud, etc.) */
  INTEGRATION_TYPE: "integration-type",
  /** Integration status (connected, disconnected, error, pending) */
  INTEGRATION_STATUS: "integration-status",
  /** Integration provider name */
  INTEGRATION_PROVIDER: "integration-provider",
  /** Last sync timestamp */
  LAST_SYNC: "last-sync",
  /** Next scheduled sync */
  NEXT_SYNC: "next-sync",
  /** Sync direction (inbound, outbound, bidirectional) */
  SYNC_DIRECTION: "sync-direction",
  /** Webhook ID */
  WEBHOOK_ID: "webhook-id",
  /** API version */
  API_VERSION: "api-version",
  /** Feature flags enabled */
  FEATURES: "features",
} as const;

// =============================================================================
// UI COMPONENT DATA ATTRIBUTES
// =============================================================================

/** Data attributes for table components */
const _TABLE_DATA_ATTRS = {
  /** Table identifier */
  TABLE_ID: "table-id",
  /** Column identifier/name */
  COLUMN: "column",
  /** Column key */
  COLUMN_KEY: "column-key",
  /** Column index */
  COLUMN_INDEX: "column-index",
  /** Row identifier */
  ROW_ID: "row-id",
  /** Row index */
  ROW_INDEX: "row-index",
  /** Cell value */
  CELL_VALUE: "cell-value",
  /** Sort order: 'asc' | 'desc' | 'none' */
  SORT_ORDER: "sort-order",
  /** Sort direction: 'asc' | 'desc' | 'none' */
  SORT_DIR: "sort-dir",
  /** Sort column key */
  SORT_KEY: "sort-key",
  /** Filter value */
  FILTER_VALUE: "filter-value",
  /** Page number */
  PAGE: "page",
  /** Page size */
  PAGE_SIZE: "page-size",
  /** Total items count */
  TOTAL: "total",
  /** Is column sortable */
  SORTABLE: "sortable",
  /** Is column filterable */
  FILTERABLE: "filterable",
  /** Is column resizable */
  RESIZABLE: "resizable",
  /** Column width */
  COLUMN_WIDTH: "column-width",
  /** Is row selected */
  ROW_SELECTED: "row-selected",
  /** Is row expanded */
  ROW_EXPANDED: "row-expanded",
} as const;

/** Data attributes for modal components */
const _MODAL_DATA_ATTRS = {
  /** Modal identifier */
  MODAL_ID: "modal-id",
  /** Modal type (dialog, alert, confirm, form) */
  MODAL_TYPE: "modal-type",
  /** Modal size (sm, md, lg, xl, fullscreen) */
  MODAL_SIZE: "modal-size",
  /** Is modal closable by overlay click */
  CLOSE_ON_OVERLAY: "close-on-overlay",
  /** Is modal closable by escape key */
  CLOSE_ON_ESC: "close-on-esc",
  /** Modal z-index layer */
  MODAL_LAYER: "modal-layer",
  /** Return focus element ID */
  RETURN_FOCUS: "return-focus",
} as const;

/** Data attributes for tooltip/popover */
const _TOOLTIP_DATA_ATTRS = {
  /** Tooltip/popover identifier */
  TOOLTIP_ID: "tooltip-id",
  /** Tooltip content */
  TOOLTIP_CONTENT: "tooltip-content",
  /** Tooltip placement (top, bottom, left, right) */
  TOOLTIP_PLACEMENT: "tooltip-placement",
  /** Tooltip trigger (hover, click, focus) */
  TOOLTIP_TRIGGER: "tooltip-trigger",
  /** Tooltip delay in ms */
  TOOLTIP_DELAY: "tooltip-delay",
  /** Target element ID */
  TOOLTIP_TARGET: "tooltip-target",
} as const;

/** Data attributes for dropdown components */
const _DROPDOWN_DATA_ATTRS = {
  /** Dropdown identifier */
  DROPDOWN_ID: "dropdown-id",
  /** Option value */
  OPTION_VALUE: "option-value",
  /** Option label */
  OPTION_LABEL: "option-label",
  /** Option disabled state */
  OPTION_DISABLED: "option-disabled",
  /** Option group */
  OPTION_GROUP: "option-group",
  /** Selected value(s) */
  SELECTED_VALUE: "selected-value",
  /** Is multi-select */
  MULTI_SELECT: "multi-select",
  /** Is searchable */
  SEARCHABLE: "searchable",
  /** Placeholder text */
  PLACEHOLDER: "placeholder",
} as const;

/** Data attributes for drag and drop */
const _DND_DATA_ATTRS = {
  /** Draggable item identifier */
  DRAGGABLE_ID: "draggable-id",
  /** Droppable zone identifier */
  DROPPABLE_ID: "droppable-id",
  /** Drag type for matching */
  DRAG_TYPE: "drag-type",
  /** Accept types for drop zones */
  ACCEPT_TYPES: "accept-types",
  /** Drag handle indicator */
  DRAG_HANDLE: "drag-handle",
  /** Drop effect (move, copy, link) */
  DROP_EFFECT: "drop-effect",
  /** Source container ID */
  SOURCE_ID: "source-id",
  /** Target container ID */
  TARGET_ID: "target-id",
  /** Original index before drag */
  ORIGINAL_INDEX: "original-index",
} as const;

// =============================================================================
// NAVIGATION DATA ATTRIBUTES
// =============================================================================

/** Data attributes for navigation */
const _NAV_DATA_ATTRS = {
  /** Navigation item identifier */
  NAV_ITEM: "nav-item",
  /** Navigation level (for nested menus) */
  NAV_LEVEL: "nav-level",
  /** Route path */
  ROUTE_PATH: "route-path",
  /** Route name */
  ROUTE_NAME: "route-name",
  /** Active route indicator */
  ROUTE_ACTIVE: "route-active",
  /** Has children/submenu */
  HAS_CHILDREN: "has-children",
  /** Tab index for keyboard navigation */
  TAB_INDEX: "tab-index",
  /** Tab panel ID (for tab components) */
  TAB_PANEL: "tab-panel",
  /** Tab ID */
  TAB_ID: "tab-id",
  /** Accordion item ID */
  ACCORDION_ITEM: "accordion-item",
  /** Accordion panel ID */
  ACCORDION_PANEL: "accordion-panel",
} as const;

// =============================================================================
// TESTING DATA ATTRIBUTES
// =============================================================================

/** Data attributes for testing (used by e2e tests) */
const _TEST_DATA_ATTRS = {
  /** Test identifier */
  TESTID: "testid",
  /** Cypress selector */
  CY: "cy",
  /** Playwright locator */
  PW: "pw",
  /** Component name for debugging */
  COMPONENT: "component",
  /** Action type for tracking */
  ACTION: "action",
  /** Analytics event name */
  ANALYTICS_EVENT: "analytics-event",
  /** Feature flag name */
  FEATURE_FLAG: "feature-flag",
} as const;

// =============================================================================
// ACCESSIBILITY DATA ATTRIBUTES
// =============================================================================

/** Data attributes for accessibility (complementing ARIA) */
const _A11Y_DATA_ATTRS = {
  /** Screen reader announcement */
  ANNOUNCE: "announce",
  /** Live region politeness */
  LIVE_REGION: "live-region",
  /** Skip link target */
  SKIP_TARGET: "skip-target",
  /** Focus trap boundary */
  FOCUS_TRAP: "focus-trap",
  /** Reduced motion preference */
  REDUCED_MOTION: "reduced-motion",
  /** High contrast mode */
  HIGH_CONTRAST: "high-contrast",
  /** Keyboard shortcut */
  SHORTCUT: "shortcut",
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen state data attributes */
export const STATE_DATA_ATTRS: DeepReadonly<typeof _STATE_DATA_ATTRS> =
  ObjectDeep.freeze(_STATE_DATA_ATTRS);

/** Frozen validation data attributes */
export const VALIDATION_DATA_ATTRS: DeepReadonly<
  typeof _VALIDATION_DATA_ATTRS
> = ObjectDeep.freeze(_VALIDATION_DATA_ATTRS);

/** Frozen entity data attributes */
export const ENTITY_DATA_ATTRS: DeepReadonly<typeof _ENTITY_DATA_ATTRS> =
  ObjectDeep.freeze(_ENTITY_DATA_ATTRS);

/** Frozen project data attributes */
export const PROJECT_DATA_ATTRS: DeepReadonly<typeof _PROJECT_DATA_ATTRS> =
  ObjectDeep.freeze(_PROJECT_DATA_ATTRS);

/** Frozen task data attributes */
export const TASK_DATA_ATTRS: DeepReadonly<typeof _TASK_DATA_ATTRS> =
  ObjectDeep.freeze(_TASK_DATA_ATTRS);

/** Frozen lead data attributes */
export const LEAD_DATA_ATTRS: DeepReadonly<typeof _LEAD_DATA_ATTRS> =
  ObjectDeep.freeze(_LEAD_DATA_ATTRS);

/** Frozen client data attributes */
export const CLIENT_DATA_ATTRS: DeepReadonly<typeof _CLIENT_DATA_ATTRS> =
  ObjectDeep.freeze(_CLIENT_DATA_ATTRS);

/** Frozen integration data attributes */
export const INTEGRATION_DATA_ATTRS: DeepReadonly<
  typeof _INTEGRATION_DATA_ATTRS
> = ObjectDeep.freeze(_INTEGRATION_DATA_ATTRS);

/** Frozen table data attributes */
export const TABLE_DATA_ATTRS: DeepReadonly<typeof _TABLE_DATA_ATTRS> =
  ObjectDeep.freeze(_TABLE_DATA_ATTRS);

/** Frozen modal data attributes */
export const MODAL_DATA_ATTRS: DeepReadonly<typeof _MODAL_DATA_ATTRS> =
  ObjectDeep.freeze(_MODAL_DATA_ATTRS);

/** Frozen tooltip data attributes */
export const TOOLTIP_DATA_ATTRS: DeepReadonly<typeof _TOOLTIP_DATA_ATTRS> =
  ObjectDeep.freeze(_TOOLTIP_DATA_ATTRS);

/** Frozen dropdown data attributes */
export const DROPDOWN_DATA_ATTRS: DeepReadonly<typeof _DROPDOWN_DATA_ATTRS> =
  ObjectDeep.freeze(_DROPDOWN_DATA_ATTRS);

/** Frozen drag and drop data attributes */
export const DND_DATA_ATTRS: DeepReadonly<typeof _DND_DATA_ATTRS> =
  ObjectDeep.freeze(_DND_DATA_ATTRS);

/** Frozen navigation data attributes */
export const NAV_DATA_ATTRS: DeepReadonly<typeof _NAV_DATA_ATTRS> =
  ObjectDeep.freeze(_NAV_DATA_ATTRS);

/** Frozen test data attributes */
export const TEST_DATA_ATTRS: DeepReadonly<typeof _TEST_DATA_ATTRS> =
  ObjectDeep.freeze(_TEST_DATA_ATTRS);

/** Frozen accessibility data attributes */
export const A11Y_DATA_ATTRS: DeepReadonly<typeof _A11Y_DATA_ATTRS> =
  ObjectDeep.freeze(_A11Y_DATA_ATTRS);

// =============================================================================
// AGGREGATE EXPORTS
// =============================================================================

/** All state-related data attributes grouped */
export const STATE_RELATED_ATTRS = ObjectDeep.freeze({
  state: STATE_DATA_ATTRS,
  validation: VALIDATION_DATA_ATTRS,
} as const);

/** All entity data attributes grouped */
export const ENTITY_ATTRS = ObjectDeep.freeze({
  common: ENTITY_DATA_ATTRS,
  project: PROJECT_DATA_ATTRS,
  task: TASK_DATA_ATTRS,
  lead: LEAD_DATA_ATTRS,
  client: CLIENT_DATA_ATTRS,
  integration: INTEGRATION_DATA_ATTRS,
} as const);

/** All UI component data attributes grouped */
export const UI_COMPONENT_ATTRS = ObjectDeep.freeze({
  table: TABLE_DATA_ATTRS,
  modal: MODAL_DATA_ATTRS,
  tooltip: TOOLTIP_DATA_ATTRS,
  dropdown: DROPDOWN_DATA_ATTRS,
  dnd: DND_DATA_ATTRS,
  nav: NAV_DATA_ATTRS,
} as const);

/** All utility data attributes grouped */
export const UTILITY_ATTRS = ObjectDeep.freeze({
  test: TEST_DATA_ATTRS,
  a11y: A11Y_DATA_ATTRS,
} as const);

/** Master dictionary of all data attributes */
export const DATA_ATTRS = ObjectDeep.freeze({
  state: STATE_RELATED_ATTRS,
  entities: ENTITY_ATTRS,
  ui: UI_COMPONENT_ATTRS,
  utility: UTILITY_ATTRS,
} as const);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a data attribute name with 'data-' prefix
 * @param key - The attribute key without prefix
 * @returns The full data attribute name
 */
export const dataAttr = (key: DataAttrKey): string => `data-${key}`;

/**
 * Build a data attribute selector for CSS/JS
 * @param key - The attribute key without prefix
 * @param value - Optional value to match
 * @returns CSS attribute selector string
 */
export const dataSelector = (
  key: DataAttrKey,
  value?: DataAttrValue,
): string => {
  if (value === undefined) return `[data-${key}]`;
  return `[data-${key}="${value}"]`;
};

/**
 * Build a dataset property name from data attribute key
 * (Converts kebab-case to camelCase)
 * @param key - The kebab-case data attribute key
 * @returns The camelCase dataset property name
 */
export const toDatasetKey = (key: DataAttrKey): string => {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Build data attributes object for Vue/React props
 * @param attrs - Object with data attribute keys and values
 * @returns Object with proper data-* keys
 */
export const buildDataAttrs = (
  attrs: Record<DataAttrKey, DataAttrValue>,
): Record<string, DataAttrValue> => {
  const result: Record<string, DataAttrValue> = {};
  for (const [key, value] of Object.entries(attrs)) {
    result[`data-${key}`] = value;
  }
  return result;
};

/**
 * Parse dataset from element into typed object
 * @param element - DOM element with dataset
 * @param keys - Array of expected data attribute keys
 * @returns Typed object with dataset values
 */
export const parseDataset = <K extends DataAttrKey>(
  element: HTMLElement,
  keys: readonly K[],
): Partial<Record<K, string>> => {
  const result: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const datasetKey = toDatasetKey(key);
    const value = element.dataset[datasetKey];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type StateDataAttr =
  (typeof STATE_DATA_ATTRS)[keyof typeof STATE_DATA_ATTRS];
export type ValidationDataAttr =
  (typeof VALIDATION_DATA_ATTRS)[keyof typeof VALIDATION_DATA_ATTRS];
export type EntityDataAttr =
  (typeof ENTITY_DATA_ATTRS)[keyof typeof ENTITY_DATA_ATTRS];
export type ProjectDataAttr =
  (typeof PROJECT_DATA_ATTRS)[keyof typeof PROJECT_DATA_ATTRS];
export type TaskDataAttr =
  (typeof TASK_DATA_ATTRS)[keyof typeof TASK_DATA_ATTRS];
export type LeadDataAttr =
  (typeof LEAD_DATA_ATTRS)[keyof typeof LEAD_DATA_ATTRS];
export type ClientDataAttr =
  (typeof CLIENT_DATA_ATTRS)[keyof typeof CLIENT_DATA_ATTRS];
export type IntegrationDataAttr =
  (typeof INTEGRATION_DATA_ATTRS)[keyof typeof INTEGRATION_DATA_ATTRS];
export type TableDataAttr =
  (typeof TABLE_DATA_ATTRS)[keyof typeof TABLE_DATA_ATTRS];
export type ModalDataAttr =
  (typeof MODAL_DATA_ATTRS)[keyof typeof MODAL_DATA_ATTRS];
export type TooltipDataAttr =
  (typeof TOOLTIP_DATA_ATTRS)[keyof typeof TOOLTIP_DATA_ATTRS];
export type DropdownDataAttr =
  (typeof DROPDOWN_DATA_ATTRS)[keyof typeof DROPDOWN_DATA_ATTRS];
export type DndDataAttr = (typeof DND_DATA_ATTRS)[keyof typeof DND_DATA_ATTRS];
export type NavDataAttr = (typeof NAV_DATA_ATTRS)[keyof typeof NAV_DATA_ATTRS];
export type TestDataAttr =
  (typeof TEST_DATA_ATTRS)[keyof typeof TEST_DATA_ATTRS];
export type A11yDataAttr =
  (typeof A11Y_DATA_ATTRS)[keyof typeof A11Y_DATA_ATTRS];
