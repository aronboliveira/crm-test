/**
 * @fileoverview Frozen dictionaries for CSS class tokens (DOMTokenList attributes).
 * Used for consistent class naming and style maintenance across the application.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/dom-classes
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** CSS class token dictionary type */
type ClassTokenDict = Readonly<Record<string, string>>;

/** Nested class token dictionary with categories */
type NestedClassTokenDict<T extends string = string> = Readonly<
  Record<T, ClassTokenDict>
>;

// =============================================================================
// COMPONENT STATE CLASSES
// =============================================================================

/** Classes for component loading states */
const _LOADING_STATE_CLASSES = {
  LOADING: "is-loading",
  LOADED: "is-loaded",
  ERROR: "is-error",
  SKELETON: "skeleton",
  SKELETON_PULSE: "skeleton--pulse",
  SKELETON_WAVE: "skeleton--wave",
  SHIMMER: "shimmer",
  SPINNER: "spinner",
  PENDING: "is-pending",
  FETCHING: "is-fetching",
} as const;

/** Classes for visibility states */
const _VISIBILITY_CLASSES = {
  VISIBLE: "is-visible",
  HIDDEN: "is-hidden",
  COLLAPSED: "is-collapsed",
  EXPANDED: "is-expanded",
  OPEN: "is-open",
  CLOSED: "is-closed",
  FADED: "is-faded",
  TRANSPARENT: "is-transparent",
  OPAQUE: "is-opaque",
  MUTED: "is-muted",
} as const;

/** Classes for interactive states */
const _INTERACTIVE_CLASSES = {
  ACTIVE: "is-active",
  INACTIVE: "is-inactive",
  DISABLED: "is-disabled",
  ENABLED: "is-enabled",
  FOCUSED: "is-focused",
  BLURRED: "is-blurred",
  HOVERED: "is-hovered",
  PRESSED: "is-pressed",
  SELECTED: "is-selected",
  CHECKED: "is-checked",
  UNCHECKED: "is-unchecked",
  DRAGGING: "is-dragging",
  DROPPING: "is-dropping",
  RESIZING: "is-resizing",
  EDITING: "is-editing",
  READONLY: "is-readonly",
} as const;

/** Classes for validation states */
const _VALIDATION_CLASSES = {
  VALID: "is-valid",
  INVALID: "is-invalid",
  WARNING: "has-warning",
  REQUIRED: "is-required",
  OPTIONAL: "is-optional",
  PRISTINE: "is-pristine",
  DIRTY: "is-dirty",
  TOUCHED: "is-touched",
  UNTOUCHED: "is-untouched",
  SUBMITTED: "is-submitted",
} as const;

/** Classes for animation states */
const _ANIMATION_CLASSES = {
  ANIMATING: "is-animating",
  ENTERING: "is-entering",
  LEAVING: "is-leaving",
  ENTER_ACTIVE: "enter-active",
  ENTER_FROM: "enter-from",
  ENTER_TO: "enter-to",
  LEAVE_ACTIVE: "leave-active",
  LEAVE_FROM: "leave-from",
  LEAVE_TO: "leave-to",
  FADE_IN: "fade-in",
  FADE_OUT: "fade-out",
  SLIDE_IN: "slide-in",
  SLIDE_OUT: "slide-out",
  BOUNCE: "bounce",
  SHAKE: "shake",
  PULSE: "pulse",
} as const;

// =============================================================================
// LAYOUT CLASSES
// =============================================================================

/** Classes for layout containers */
const _LAYOUT_CLASSES = {
  CONTAINER: "container",
  CONTAINER_FLUID: "container-fluid",
  CONTAINER_SM: "container--sm",
  CONTAINER_MD: "container--md",
  CONTAINER_LG: "container--lg",
  CONTAINER_XL: "container--xl",
  ROW: "row",
  COL: "col",
  GRID: "grid",
  FLEX: "flex",
  FLEX_ROW: "flex-row",
  FLEX_COL: "flex-col",
  FLEX_WRAP: "flex-wrap",
  FLEX_NOWRAP: "flex-nowrap",
  STACK: "stack",
  STACK_H: "stack--h",
  STACK_V: "stack--v",
} as const;

/** Classes for spacing utilities */
const _SPACING_CLASSES = {
  GAP_0: "gap-0",
  GAP_1: "gap-1",
  GAP_2: "gap-2",
  GAP_3: "gap-3",
  GAP_4: "gap-4",
  GAP_5: "gap-5",
  GAP_6: "gap-6",
  GAP_8: "gap-8",
  P_0: "p-0",
  P_1: "p-1",
  P_2: "p-2",
  P_3: "p-3",
  P_4: "p-4",
  M_0: "m-0",
  M_1: "m-1",
  M_2: "m-2",
  M_3: "m-3",
  M_4: "m-4",
  M_AUTO: "m-auto",
  MX_AUTO: "mx-auto",
  MY_AUTO: "my-auto",
} as const;

/** Classes for alignment */
const _ALIGNMENT_CLASSES = {
  ITEMS_START: "items-start",
  ITEMS_CENTER: "items-center",
  ITEMS_END: "items-end",
  ITEMS_STRETCH: "items-stretch",
  ITEMS_BASELINE: "items-baseline",
  JUSTIFY_START: "justify-start",
  JUSTIFY_CENTER: "justify-center",
  JUSTIFY_END: "justify-end",
  JUSTIFY_BETWEEN: "justify-between",
  JUSTIFY_AROUND: "justify-around",
  JUSTIFY_EVENLY: "justify-evenly",
  CONTENT_START: "content-start",
  CONTENT_CENTER: "content-center",
  CONTENT_END: "content-end",
  TEXT_LEFT: "text-left",
  TEXT_CENTER: "text-center",
  TEXT_RIGHT: "text-right",
  TEXT_JUSTIFY: "text-justify",
} as const;

// =============================================================================
// COMPONENT-SPECIFIC CLASSES
// =============================================================================

/** Classes for card components */
const _CARD_CLASSES = {
  CARD: "card",
  CARD_HEADER: "card-header",
  CARD_BODY: "card-body",
  CARD_FOOTER: "card-footer",
  CARD_TITLE: "card-title",
  CARD_SUBTITLE: "card-subtitle",
  CARD_TEXT: "card-text",
  CARD_DESCRIPTION: "card-description",
  CARD_ACTIONS: "card-actions",
  CARD_IMAGE: "card-image",
  CARD_ELEVATED: "card--elevated",
  CARD_OUTLINED: "card--outlined",
  CARD_FILLED: "card--filled",
  CARD_INTERACTIVE: "card--interactive",
  CARD_CLICKABLE: "card--clickable",
} as const;

/** Classes for button components */
const _BUTTON_CLASSES = {
  BTN: "btn",
  BTN_PRIMARY: "btn-primary",
  BTN_SECONDARY: "btn-secondary",
  BTN_TERTIARY: "btn-tertiary",
  BTN_DANGER: "btn-danger",
  BTN_WARNING: "btn-warning",
  BTN_SUCCESS: "btn-success",
  BTN_INFO: "btn-info",
  BTN_GHOST: "btn-ghost",
  BTN_LINK: "btn-link",
  BTN_OUTLINE: "btn--outline",
  BTN_SOLID: "btn--solid",
  BTN_SM: "btn--sm",
  BTN_MD: "btn--md",
  BTN_LG: "btn--lg",
  BTN_XL: "btn--xl",
  BTN_ICON: "btn-icon",
  BTN_ICON_ONLY: "btn--icon-only",
  BTN_BLOCK: "btn--block",
  BTN_ROUNDED: "btn--rounded",
  BTN_PILL: "btn--pill",
} as const;

/** Classes for form components */
const _FORM_CLASSES = {
  FORM: "form",
  FORM_GROUP: "form-group",
  FORM_FIELD: "form-field",
  FORM_LABEL: "form-label",
  FORM_INPUT: "form-input",
  FORM_CONTROL: "form-control",
  FORM_SELECT: "form-select",
  FORM_TEXTAREA: "form-textarea",
  FORM_CHECKBOX: "form-checkbox",
  FORM_RADIO: "form-radio",
  FORM_SWITCH: "form-switch",
  FORM_HELPER: "form-helper",
  FORM_ERROR: "form-error",
  FORM_HINT: "form-hint",
  FORM_INLINE: "form--inline",
  FORM_HORIZONTAL: "form--horizontal",
  FORM_VERTICAL: "form--vertical",
  FORM_FLOATING: "form--floating",
  INPUT_GROUP: "input-group",
  INPUT_ADDON: "input-addon",
} as const;

/** Classes for table components */
const _TABLE_CLASSES = {
  TABLE: "table",
  TABLE_WRAPPER: "table-wrapper",
  TABLE_CONTAINER: "table-container",
  TABLE_HEAD: "table-head",
  TABLE_BODY: "table-body",
  TABLE_FOOTER: "table-footer",
  TABLE_ROW: "table-row",
  TABLE_CELL: "table-cell",
  TABLE_HEADER_CELL: "table-header-cell",
  TABLE_STRIPED: "table--striped",
  TABLE_BORDERED: "table--bordered",
  TABLE_HOVERABLE: "table--hoverable",
  TABLE_COMPACT: "table--compact",
  TABLE_SORTABLE: "table--sortable",
  TABLE_SELECTABLE: "table--selectable",
  TH_SORTABLE: "th--sortable",
  TH_SORTED_ASC: "th--sorted-asc",
  TH_SORTED_DESC: "th--sorted-desc",
} as const;

/** Classes for modal/dialog components */
const _MODAL_CLASSES = {
  MODAL: "modal",
  MODAL_BACKDROP: "modal-backdrop",
  MODAL_OVERLAY: "modal-overlay",
  MODAL_CONTAINER: "modal-container",
  MODAL_DIALOG: "modal-dialog",
  MODAL_CONTENT: "modal-content",
  MODAL_HEADER: "modal-header",
  MODAL_BODY: "modal-body",
  MODAL_FOOTER: "modal-footer",
  MODAL_TITLE: "modal-title",
  MODAL_CLOSE: "modal-close",
  MODAL_SM: "modal--sm",
  MODAL_MD: "modal--md",
  MODAL_LG: "modal--lg",
  MODAL_XL: "modal--xl",
  MODAL_FULLSCREEN: "modal--fullscreen",
  MODAL_CENTERED: "modal--centered",
  MODAL_SCROLLABLE: "modal--scrollable",
} as const;

/** Classes for navigation components */
const _NAV_CLASSES = {
  NAV: "nav",
  NAV_ITEM: "nav-item",
  NAV_LINK: "nav-link",
  NAV_TABS: "nav--tabs",
  NAV_PILLS: "nav--pills",
  NAV_VERTICAL: "nav--vertical",
  NAV_HORIZONTAL: "nav--horizontal",
  NAVBAR: "navbar",
  NAVBAR_BRAND: "navbar-brand",
  NAVBAR_TOGGLE: "navbar-toggle",
  NAVBAR_COLLAPSE: "navbar-collapse",
  SIDEBAR: "sidebar",
  SIDEBAR_HEADER: "sidebar-header",
  SIDEBAR_CONTENT: "sidebar-content",
  SIDEBAR_FOOTER: "sidebar-footer",
  SIDEBAR_COLLAPSED: "sidebar--collapsed",
  SIDEBAR_EXPANDED: "sidebar--expanded",
  BREADCRUMB: "breadcrumb",
  BREADCRUMB_ITEM: "breadcrumb-item",
} as const;

/** Classes for badge/tag components */
const _BADGE_CLASSES = {
  BADGE: "badge",
  BADGE_PRIMARY: "badge--primary",
  BADGE_SECONDARY: "badge--secondary",
  BADGE_SUCCESS: "badge--success",
  BADGE_WARNING: "badge--warning",
  BADGE_DANGER: "badge--danger",
  BADGE_INFO: "badge--info",
  BADGE_LIGHT: "badge--light",
  BADGE_DARK: "badge--dark",
  BADGE_PILL: "badge--pill",
  BADGE_DOT: "badge--dot",
  TAG: "tag",
  TAG_REMOVABLE: "tag--removable",
  TAG_GROUP: "tag-group",
  CHIP: "chip",
  CHIP_REMOVABLE: "chip--removable",
} as const;

/** Classes for alert/notification components */
const _ALERT_CLASSES = {
  ALERT: "alert",
  ALERT_SUCCESS: "alert--success",
  ALERT_WARNING: "alert--warning",
  ALERT_DANGER: "alert--danger",
  ALERT_INFO: "alert--info",
  ALERT_PRIMARY: "alert--primary",
  ALERT_DISMISSIBLE: "alert--dismissible",
  TOAST: "toast",
  TOAST_CONTAINER: "toast-container",
  NOTIFICATION: "notification",
  NOTIFICATION_BADGE: "notification-badge",
} as const;

/** Classes for integration components */
const _INTEGRATION_CLASSES = {
  INTEGRATION_CARD: "integration-card",
  INTEGRATION_HEADER: "integration-header",
  INTEGRATION_BODY: "integration-body",
  INTEGRATION_ICON: "integration-icon",
  INTEGRATION_ICON_WRAPPER: "icon-wrapper",
  INTEGRATION_TITLE: "card-title",
  INTEGRATION_TYPE: "card-type",
  INTEGRATION_DESCRIPTION: "card-description",
  INTEGRATION_FEATURES: "features-section",
  INTEGRATION_FEATURES_LIST: "features-list",
  INTEGRATION_FEATURE_ITEM: "feature-item",
  INTEGRATION_ACTIONS: "card-actions",
  HEADER_LEFT: "header-left",
  HEADER_RIGHT: "header-right",
  HEADER_INFO: "header-info",
  EXPAND_BTN: "expand-btn",
  CHEVRON_ICON: "chevron-icon",
  ROTATED: "rotated",
  CHECK_ICON: "check-icon",
  BTN_ICON: "btn-icon",
} as const;

/** Classes for status indicators */
const _STATUS_CLASSES = {
  STATUS: "status",
  STATUS_BADGE: "status-badge",
  STATUS_DOT: "status-dot",
  STATUS_INDICATOR: "status-indicator",
  STATUS_CONNECTED: "status-connected",
  STATUS_DISCONNECTED: "status-disconnected",
  STATUS_ERROR: "status-error",
  STATUS_PENDING: "status-pending",
  STATUS_ONLINE: "status-online",
  STATUS_OFFLINE: "status-offline",
  STATUS_BUSY: "status-busy",
  STATUS_AWAY: "status-away",
  STATUS_IDLE: "status-idle",
  STATUS_SYNCING: "status-syncing",
  STATUS_SYNCED: "status-synced",
} as const;

// =============================================================================
// UTILITY CLASSES
// =============================================================================

/** Classes for typography */
const _TYPOGRAPHY_CLASSES = {
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  H5: "h5",
  H6: "h6",
  TEXT_XS: "text-xs",
  TEXT_SM: "text-sm",
  TEXT_BASE: "text-base",
  TEXT_LG: "text-lg",
  TEXT_XL: "text-xl",
  TEXT_2XL: "text-2xl",
  TEXT_MUTED: "text-muted",
  TEXT_PRIMARY: "text-primary",
  TEXT_SECONDARY: "text-secondary",
  TEXT_SUCCESS: "text-success",
  TEXT_WARNING: "text-warning",
  TEXT_DANGER: "text-danger",
  TEXT_INFO: "text-info",
  FONT_BOLD: "font-bold",
  FONT_SEMIBOLD: "font-semibold",
  FONT_MEDIUM: "font-medium",
  FONT_NORMAL: "font-normal",
  FONT_LIGHT: "font-light",
  FONT_MONO: "font-mono",
  TRUNCATE: "truncate",
  LINE_CLAMP_1: "line-clamp-1",
  LINE_CLAMP_2: "line-clamp-2",
  LINE_CLAMP_3: "line-clamp-3",
} as const;

/** Classes for accessibility */
const _A11Y_CLASSES = {
  SR_ONLY: "sr-only",
  NOT_SR_ONLY: "not-sr-only",
  FOCUS_RING: "focus-ring",
  FOCUS_VISIBLE: "focus-visible",
  SKIP_LINK: "skip-link",
  VISUALLY_HIDDEN: "visually-hidden",
  REDUCED_MOTION: "reduced-motion",
  HIGH_CONTRAST: "high-contrast",
} as const;

/** Classes for responsive behavior */
const _RESPONSIVE_CLASSES = {
  HIDE_SM: "hide-sm",
  HIDE_MD: "hide-md",
  HIDE_LG: "hide-lg",
  HIDE_XL: "hide-xl",
  SHOW_SM: "show-sm",
  SHOW_MD: "show-md",
  SHOW_LG: "show-lg",
  SHOW_XL: "show-xl",
  MOBILE_ONLY: "mobile-only",
  DESKTOP_ONLY: "desktop-only",
  TABLET_ONLY: "tablet-only",
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen loading state classes */
export const LOADING_STATE_CLASSES: DeepReadonly<
  typeof _LOADING_STATE_CLASSES
> = ObjectDeep.freeze(_LOADING_STATE_CLASSES);

/** Frozen visibility classes */
export const VISIBILITY_CLASSES: DeepReadonly<typeof _VISIBILITY_CLASSES> =
  ObjectDeep.freeze(_VISIBILITY_CLASSES);

/** Frozen interactive state classes */
export const INTERACTIVE_CLASSES: DeepReadonly<typeof _INTERACTIVE_CLASSES> =
  ObjectDeep.freeze(_INTERACTIVE_CLASSES);

/** Frozen validation state classes */
export const VALIDATION_CLASSES: DeepReadonly<typeof _VALIDATION_CLASSES> =
  ObjectDeep.freeze(_VALIDATION_CLASSES);

/** Frozen animation classes */
export const ANIMATION_CLASSES: DeepReadonly<typeof _ANIMATION_CLASSES> =
  ObjectDeep.freeze(_ANIMATION_CLASSES);

/** Frozen layout classes */
export const LAYOUT_CLASSES: DeepReadonly<typeof _LAYOUT_CLASSES> =
  ObjectDeep.freeze(_LAYOUT_CLASSES);

/** Frozen spacing utility classes */
export const SPACING_CLASSES: DeepReadonly<typeof _SPACING_CLASSES> =
  ObjectDeep.freeze(_SPACING_CLASSES);

/** Frozen alignment classes */
export const ALIGNMENT_CLASSES: DeepReadonly<typeof _ALIGNMENT_CLASSES> =
  ObjectDeep.freeze(_ALIGNMENT_CLASSES);

/** Frozen card component classes */
export const CARD_CLASSES: DeepReadonly<typeof _CARD_CLASSES> =
  ObjectDeep.freeze(_CARD_CLASSES);

/** Frozen button component classes */
export const BUTTON_CLASSES: DeepReadonly<typeof _BUTTON_CLASSES> =
  ObjectDeep.freeze(_BUTTON_CLASSES);

/** Frozen form component classes */
export const FORM_CLASSES: DeepReadonly<typeof _FORM_CLASSES> =
  ObjectDeep.freeze(_FORM_CLASSES);

/** Frozen table component classes */
export const TABLE_CLASSES: DeepReadonly<typeof _TABLE_CLASSES> =
  ObjectDeep.freeze(_TABLE_CLASSES);

/** Frozen modal component classes */
export const MODAL_CLASSES: DeepReadonly<typeof _MODAL_CLASSES> =
  ObjectDeep.freeze(_MODAL_CLASSES);

/** Frozen navigation classes */
export const NAV_CLASSES: DeepReadonly<typeof _NAV_CLASSES> =
  ObjectDeep.freeze(_NAV_CLASSES);

/** Frozen badge/tag classes */
export const BADGE_CLASSES: DeepReadonly<typeof _BADGE_CLASSES> =
  ObjectDeep.freeze(_BADGE_CLASSES);

/** Frozen alert/notification classes */
export const ALERT_CLASSES: DeepReadonly<typeof _ALERT_CLASSES> =
  ObjectDeep.freeze(_ALERT_CLASSES);

/** Frozen integration component classes */
export const INTEGRATION_CLASSES: DeepReadonly<typeof _INTEGRATION_CLASSES> =
  ObjectDeep.freeze(_INTEGRATION_CLASSES);

/** Frozen status indicator classes */
export const STATUS_CLASSES: DeepReadonly<typeof _STATUS_CLASSES> =
  ObjectDeep.freeze(_STATUS_CLASSES);

/** Frozen typography classes */
export const TYPOGRAPHY_CLASSES: DeepReadonly<typeof _TYPOGRAPHY_CLASSES> =
  ObjectDeep.freeze(_TYPOGRAPHY_CLASSES);

/** Frozen accessibility classes */
export const A11Y_CLASSES: DeepReadonly<typeof _A11Y_CLASSES> =
  ObjectDeep.freeze(_A11Y_CLASSES);

/** Frozen responsive classes */
export const RESPONSIVE_CLASSES: DeepReadonly<typeof _RESPONSIVE_CLASSES> =
  ObjectDeep.freeze(_RESPONSIVE_CLASSES);

// =============================================================================
// AGGREGATE EXPORTS
// =============================================================================

/** All state-related classes grouped */
export const STATE_CLASSES = ObjectDeep.freeze({
  loading: LOADING_STATE_CLASSES,
  visibility: VISIBILITY_CLASSES,
  interactive: INTERACTIVE_CLASSES,
  validation: VALIDATION_CLASSES,
  animation: ANIMATION_CLASSES,
  status: STATUS_CLASSES,
} as const);

/** All component classes grouped */
export const COMPONENT_CLASSES = ObjectDeep.freeze({
  card: CARD_CLASSES,
  button: BUTTON_CLASSES,
  form: FORM_CLASSES,
  table: TABLE_CLASSES,
  modal: MODAL_CLASSES,
  nav: NAV_CLASSES,
  badge: BADGE_CLASSES,
  alert: ALERT_CLASSES,
  integration: INTEGRATION_CLASSES,
} as const);

/** All layout/utility classes grouped */
export const UTILITY_CLASSES = ObjectDeep.freeze({
  layout: LAYOUT_CLASSES,
  spacing: SPACING_CLASSES,
  alignment: ALIGNMENT_CLASSES,
  typography: TYPOGRAPHY_CLASSES,
  a11y: A11Y_CLASSES,
  responsive: RESPONSIVE_CLASSES,
} as const);

/** Master dictionary of all CSS classes */
export const CSS_CLASSES = ObjectDeep.freeze({
  state: STATE_CLASSES,
  components: COMPONENT_CLASSES,
  utility: UTILITY_CLASSES,
} as const);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoadingStateClass =
  (typeof LOADING_STATE_CLASSES)[keyof typeof LOADING_STATE_CLASSES];
export type VisibilityClass =
  (typeof VISIBILITY_CLASSES)[keyof typeof VISIBILITY_CLASSES];
export type InteractiveClass =
  (typeof INTERACTIVE_CLASSES)[keyof typeof INTERACTIVE_CLASSES];
export type ValidationClass =
  (typeof VALIDATION_CLASSES)[keyof typeof VALIDATION_CLASSES];
export type AnimationClass =
  (typeof ANIMATION_CLASSES)[keyof typeof ANIMATION_CLASSES];
export type CardClass = (typeof CARD_CLASSES)[keyof typeof CARD_CLASSES];
export type ButtonClass = (typeof BUTTON_CLASSES)[keyof typeof BUTTON_CLASSES];
export type FormClass = (typeof FORM_CLASSES)[keyof typeof FORM_CLASSES];
export type TableClass = (typeof TABLE_CLASSES)[keyof typeof TABLE_CLASSES];
export type ModalClass = (typeof MODAL_CLASSES)[keyof typeof MODAL_CLASSES];
export type NavClass = (typeof NAV_CLASSES)[keyof typeof NAV_CLASSES];
export type BadgeClass = (typeof BADGE_CLASSES)[keyof typeof BADGE_CLASSES];
export type AlertClass = (typeof ALERT_CLASSES)[keyof typeof ALERT_CLASSES];
export type IntegrationClass =
  (typeof INTEGRATION_CLASSES)[keyof typeof INTEGRATION_CLASSES];
export type StatusClass = (typeof STATUS_CLASSES)[keyof typeof STATUS_CLASSES];
export type TypographyClass =
  (typeof TYPOGRAPHY_CLASSES)[keyof typeof TYPOGRAPHY_CLASSES];
export type A11yClass = (typeof A11Y_CLASSES)[keyof typeof A11Y_CLASSES];
export type ResponsiveClass =
  (typeof RESPONSIVE_CLASSES)[keyof typeof RESPONSIVE_CLASSES];
