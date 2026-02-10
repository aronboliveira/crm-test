/**
 * @fileoverview Frozen dictionaries for ARIA attributes.
 * Used for consistent accessibility attribute naming across the application.
 * All exports are deeply frozen to ensure immutability.
 * @module constants/dom-aria
 */

import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

// =============================================================================
// ARIA ROLE VALUES
// =============================================================================

/** ARIA role values for semantic elements */
const _ARIA_ROLES = {
  // Landmark roles
  BANNER: "banner",
  COMPLEMENTARY: "complementary",
  CONTENT_INFO: "contentinfo",
  FORM: "form",
  MAIN: "main",
  NAVIGATION: "navigation",
  REGION: "region",
  SEARCH: "search",

  // Widget roles
  ALERT: "alert",
  ALERTDIALOG: "alertdialog",
  BUTTON: "button",
  CHECKBOX: "checkbox",
  COMBOBOX: "combobox",
  DIALOG: "dialog",
  GRID: "grid",
  GRIDCELL: "gridcell",
  LINK: "link",
  LISTBOX: "listbox",
  MENU: "menu",
  MENUBAR: "menubar",
  MENUITEM: "menuitem",
  MENUITEMCHECKBOX: "menuitemcheckbox",
  MENUITEMRADIO: "menuitemradio",
  OPTION: "option",
  PROGRESSBAR: "progressbar",
  RADIO: "radio",
  RADIOGROUP: "radiogroup",
  SCROLLBAR: "scrollbar",
  SEARCHBOX: "searchbox",
  SLIDER: "slider",
  SPINBUTTON: "spinbutton",
  STATUS: "status",
  SWITCH: "switch",
  TAB: "tab",
  TABLIST: "tablist",
  TABPANEL: "tabpanel",
  TEXTBOX: "textbox",
  TIMER: "timer",
  TOOLTIP: "tooltip",
  TREE: "tree",
  TREEITEM: "treeitem",
  TREEGRID: "treegrid",

  // Document structure roles
  APPLICATION: "application",
  ARTICLE: "article",
  CELL: "cell",
  COLUMNHEADER: "columnheader",
  DEFINITION: "definition",
  DIRECTORY: "directory",
  DOCUMENT: "document",
  FEED: "feed",
  FIGURE: "figure",
  GROUP: "group",
  HEADING: "heading",
  IMG: "img",
  LIST: "list",
  LISTITEM: "listitem",
  MATH: "math",
  NOTE: "note",
  PRESENTATION: "presentation",
  ROW: "row",
  ROWGROUP: "rowgroup",
  ROWHEADER: "rowheader",
  SEPARATOR: "separator",
  TABLE: "table",
  TERM: "term",
  TOOLBAR: "toolbar",

  // Live region roles
  LOG: "log",
  MARQUEE: "marquee",
} as const;

// =============================================================================
// ARIA STATE VALUES
// =============================================================================

/** ARIA state attribute values */
const _ARIA_STATES = {
  // Boolean states
  TRUE: "true",
  FALSE: "false",
  MIXED: "mixed",
  UNDEFINED: "undefined",

  // Expanded state
  EXPANDED_TRUE: "true",
  EXPANDED_FALSE: "false",

  // Selected state
  SELECTED_TRUE: "true",
  SELECTED_FALSE: "false",

  // Checked state
  CHECKED_TRUE: "true",
  CHECKED_FALSE: "false",
  CHECKED_MIXED: "mixed",

  // Pressed state
  PRESSED_TRUE: "true",
  PRESSED_FALSE: "false",
  PRESSED_MIXED: "mixed",

  // Disabled state
  DISABLED_TRUE: "true",
  DISABLED_FALSE: "false",

  // Hidden state
  HIDDEN_TRUE: "true",
  HIDDEN_FALSE: "false",

  // Invalid state
  INVALID_TRUE: "true",
  INVALID_FALSE: "false",
  INVALID_GRAMMAR: "grammar",
  INVALID_SPELLING: "spelling",

  // Current state
  CURRENT_TRUE: "true",
  CURRENT_FALSE: "false",
  CURRENT_PAGE: "page",
  CURRENT_STEP: "step",
  CURRENT_LOCATION: "location",
  CURRENT_DATE: "date",
  CURRENT_TIME: "time",

  // Busy state
  BUSY_TRUE: "true",
  BUSY_FALSE: "false",
} as const;

// =============================================================================
// ARIA PROPERTY VALUES
// =============================================================================

/** ARIA live region values */
const _ARIA_LIVE = {
  OFF: "off",
  POLITE: "polite",
  ASSERTIVE: "assertive",
} as const;

/** ARIA autocomplete values */
const _ARIA_AUTOCOMPLETE = {
  NONE: "none",
  INLINE: "inline",
  LIST: "list",
  BOTH: "both",
} as const;

/** ARIA sort values */
const _ARIA_SORT = {
  NONE: "none",
  ASCENDING: "ascending",
  DESCENDING: "descending",
  OTHER: "other",
} as const;

/** ARIA orientation values */
const _ARIA_ORIENTATION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
  UNDEFINED: "undefined",
} as const;

/** ARIA haspopup values */
const _ARIA_HASPOPUP = {
  FALSE: "false",
  TRUE: "true",
  MENU: "menu",
  LISTBOX: "listbox",
  TREE: "tree",
  GRID: "grid",
  DIALOG: "dialog",
} as const;

/** ARIA relevant values */
const _ARIA_RELEVANT = {
  ADDITIONS: "additions",
  ADDITIONS_TEXT: "additions text",
  ALL: "all",
  REMOVALS: "removals",
  TEXT: "text",
} as const;

/** ARIA dropeffect values */
const _ARIA_DROPEFFECT = {
  COPY: "copy",
  EXECUTE: "execute",
  LINK: "link",
  MOVE: "move",
  NONE: "none",
  POPUP: "popup",
} as const;

// =============================================================================
// ARIA ATTRIBUTE NAMES
// =============================================================================

/** ARIA attribute names (without 'aria-' prefix) */
const _ARIA_ATTR_NAMES = {
  // Widget attributes
  AUTOCOMPLETE: "autocomplete",
  CHECKED: "checked",
  DISABLED: "disabled",
  ERRORMESSAGE: "errormessage",
  EXPANDED: "expanded",
  HASPOPUP: "haspopup",
  HIDDEN: "hidden",
  INVALID: "invalid",
  LABEL: "label",
  LEVEL: "level",
  MODAL: "modal",
  MULTILINE: "multiline",
  MULTISELECTABLE: "multiselectable",
  ORIENTATION: "orientation",
  PLACEHOLDER: "placeholder",
  PRESSED: "pressed",
  READONLY: "readonly",
  REQUIRED: "required",
  SELECTED: "selected",
  SORT: "sort",
  VALUEMAX: "valuemax",
  VALUEMIN: "valuemin",
  VALUENOW: "valuenow",
  VALUETEXT: "valuetext",

  // Live region attributes
  ATOMIC: "atomic",
  BUSY: "busy",
  LIVE: "live",
  RELEVANT: "relevant",

  // Drag and drop attributes
  DROPEFFECT: "dropeffect",
  GRABBED: "grabbed",

  // Relationship attributes
  ACTIVEDESCENDANT: "activedescendant",
  COLCOUNT: "colcount",
  COLINDEX: "colindex",
  COLSPAN: "colspan",
  CONTROLS: "controls",
  DESCRIBEDBY: "describedby",
  DETAILS: "details",
  FLOWTO: "flowto",
  LABELLEDBY: "labelledby",
  OWNS: "owns",
  POSINSET: "posinset",
  ROWCOUNT: "rowcount",
  ROWINDEX: "rowindex",
  ROWSPAN: "rowspan",
  SETSIZE: "setsize",

  // Other
  CURRENT: "current",
  KEYSHORTCUTS: "keyshortcuts",
  ROLEDESCRIPTION: "roledescription",
} as const;

// =============================================================================
// COMMON ARIA LABELS (for consistent text)
// =============================================================================

/** Common ARIA label texts in Portuguese */
const _ARIA_LABELS = {
  // Navigation
  MAIN_NAVIGATION: "Navegação principal",
  BREADCRUMB: "Navegação de localização",
  PAGINATION: "Paginação",
  SIDEBAR: "Barra lateral",
  MENU: "Menu",
  SUBMENU: "Submenu",
  USER_MENU: "Menu do usuário",
  NOTIFICATIONS: "Notificações",
  SEARCH: "Buscar",

  // Actions
  CLOSE: "Fechar",
  OPEN: "Abrir",
  EXPAND: "Expandir",
  COLLAPSE: "Recolher",
  SHOW: "Mostrar",
  HIDE: "Ocultar",
  NEXT: "Próximo",
  PREVIOUS: "Anterior",
  FIRST: "Primeiro",
  LAST: "Último",
  SUBMIT: "Enviar",
  CANCEL: "Cancelar",
  CONFIRM: "Confirmar",
  DELETE: "Excluir",
  EDIT: "Editar",
  SAVE: "Salvar",
  REFRESH: "Atualizar",
  LOADING: "Carregando",

  // Status
  SUCCESS: "Sucesso",
  ERROR: "Erro",
  WARNING: "Aviso",
  INFO: "Informação",
  REQUIRED: "Obrigatório",
  OPTIONAL: "Opcional",

  // Components
  MODAL: "Janela modal",
  DIALOG: "Diálogo",
  ALERT: "Alerta",
  TOOLTIP: "Dica",
  DROPDOWN: "Lista suspensa",
  TABS: "Abas",
  ACCORDION: "Acordeão",
  CAROUSEL: "Carrossel",
  TABLE: "Tabela",
  FORM: "Formulário",

  // Integrations
  INTEGRATION_STATUS: "Status da integração",
  INTEGRATION_ACTIONS: "Ações da integração",
  TEST_CONNECTION: "Testar conexão",
  CONFIGURE: "Configurar",
  SYNC: "Sincronizar",
  FEATURES: "Funcionalidades disponíveis",

  // Tables
  SORT_ASCENDING: "Ordenar em ordem crescente",
  SORT_DESCENDING: "Ordenar em ordem decrescente",
  FILTER: "Filtrar",
  SELECT_ALL: "Selecionar todos",
  SELECT_ROW: "Selecionar linha",
  EXPAND_ROW: "Expandir linha",

  // Forms
  SHOW_PASSWORD: "Mostrar senha",
  HIDE_PASSWORD: "Ocultar senha",
  CLEAR_FIELD: "Limpar campo",
  CALENDAR: "Calendário",
  COLOR_PICKER: "Seletor de cor",
  FILE_INPUT: "Selecionar arquivo",
} as const;

// =============================================================================
// FROZEN EXPORTS
// =============================================================================

/** Frozen ARIA roles */
export const ARIA_ROLES: DeepReadonly<typeof _ARIA_ROLES> =
  ObjectDeep.freeze(_ARIA_ROLES);

/** Frozen ARIA states */
export const ARIA_STATES: DeepReadonly<typeof _ARIA_STATES> =
  ObjectDeep.freeze(_ARIA_STATES);

/** Frozen ARIA live values */
export const ARIA_LIVE: DeepReadonly<typeof _ARIA_LIVE> =
  ObjectDeep.freeze(_ARIA_LIVE);

/** Frozen ARIA autocomplete values */
export const ARIA_AUTOCOMPLETE: DeepReadonly<typeof _ARIA_AUTOCOMPLETE> =
  ObjectDeep.freeze(_ARIA_AUTOCOMPLETE);

/** Frozen ARIA sort values */
export const ARIA_SORT: DeepReadonly<typeof _ARIA_SORT> =
  ObjectDeep.freeze(_ARIA_SORT);

/** Frozen ARIA orientation values */
export const ARIA_ORIENTATION: DeepReadonly<typeof _ARIA_ORIENTATION> =
  ObjectDeep.freeze(_ARIA_ORIENTATION);

/** Frozen ARIA haspopup values */
export const ARIA_HASPOPUP: DeepReadonly<typeof _ARIA_HASPOPUP> =
  ObjectDeep.freeze(_ARIA_HASPOPUP);

/** Frozen ARIA relevant values */
export const ARIA_RELEVANT: DeepReadonly<typeof _ARIA_RELEVANT> =
  ObjectDeep.freeze(_ARIA_RELEVANT);

/** Frozen ARIA dropeffect values */
export const ARIA_DROPEFFECT: DeepReadonly<typeof _ARIA_DROPEFFECT> =
  ObjectDeep.freeze(_ARIA_DROPEFFECT);

/** Frozen ARIA attribute names */
export const ARIA_ATTR_NAMES: DeepReadonly<typeof _ARIA_ATTR_NAMES> =
  ObjectDeep.freeze(_ARIA_ATTR_NAMES);

/** Frozen ARIA labels */
export const ARIA_LABELS: DeepReadonly<typeof _ARIA_LABELS> =
  ObjectDeep.freeze(_ARIA_LABELS);

// =============================================================================
// AGGREGATE EXPORTS
// =============================================================================

/** All ARIA values grouped */
export const ARIA_VALUES = ObjectDeep.freeze({
  roles: ARIA_ROLES,
  states: ARIA_STATES,
  live: ARIA_LIVE,
  autocomplete: ARIA_AUTOCOMPLETE,
  sort: ARIA_SORT,
  orientation: ARIA_ORIENTATION,
  haspopup: ARIA_HASPOPUP,
  relevant: ARIA_RELEVANT,
  dropeffect: ARIA_DROPEFFECT,
} as const);

/** Master ARIA dictionary */
export const ARIA = ObjectDeep.freeze({
  values: ARIA_VALUES,
  attrs: ARIA_ATTR_NAMES,
  labels: ARIA_LABELS,
} as const);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build an aria attribute name with 'aria-' prefix
 * @param attr - The attribute name without prefix
 * @returns The full aria attribute name
 */
export const ariaAttr = (attr: keyof typeof _ARIA_ATTR_NAMES): string =>
  `aria-${_ARIA_ATTR_NAMES[attr]}`;

/**
 * Build aria attributes object for component props
 * @param attrs - Object with aria attribute names and values
 * @returns Object with proper aria-* keys
 */
export const buildAriaAttrs = (
  attrs: Partial<
    Record<keyof typeof _ARIA_ATTR_NAMES, string | boolean | number>
  >,
): Record<string, string | boolean | number> => {
  const result: Record<string, string | boolean | number> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const attrName = _ARIA_ATTR_NAMES[key as keyof typeof _ARIA_ATTR_NAMES];
    if (attrName && value !== undefined) {
      result[`aria-${attrName}`] = value;
    }
  }
  return result;
};

/**
 * Build complete accessibility props for a button
 * @param label - The accessible label
 * @param options - Additional options
 * @returns Object with role and aria attributes
 */
export const buildButtonA11y = (
  label: string,
  options: {
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
    controls?: string;
    haspopup?: (typeof _ARIA_HASPOPUP)[keyof typeof _ARIA_HASPOPUP];
  } = {},
): Record<string, string | boolean> => {
  const attrs: Record<string, string | boolean> = {
    "aria-label": label,
  };

  if (options.disabled !== undefined) {
    attrs["aria-disabled"] = options.disabled;
  }
  if (options.pressed !== undefined) {
    attrs["aria-pressed"] = options.pressed;
  }
  if (options.expanded !== undefined) {
    attrs["aria-expanded"] = options.expanded;
  }
  if (options.controls) {
    attrs["aria-controls"] = options.controls;
  }
  if (options.haspopup) {
    attrs["aria-haspopup"] = options.haspopup;
  }

  return attrs;
};

/**
 * Build complete accessibility props for a dialog
 * @param labelledBy - ID of the element that labels the dialog
 * @param describedBy - ID of the element that describes the dialog
 * @param modal - Whether the dialog is modal
 * @returns Object with role and aria attributes
 */
export const buildDialogA11y = (
  labelledBy: string,
  describedBy?: string,
  modal = true,
): Record<string, string | boolean> => {
  const attrs: Record<string, string | boolean> = {
    role: ARIA_ROLES.DIALOG,
    "aria-labelledby": labelledBy,
    "aria-modal": modal,
  };

  if (describedBy) {
    attrs["aria-describedby"] = describedBy;
  }

  return attrs;
};

/**
 * Build complete accessibility props for a listbox
 * @param label - The accessible label
 * @param options - Additional options
 * @returns Object with role and aria attributes
 */
export const buildListboxA11y = (
  label: string,
  options: {
    multiselectable?: boolean;
    orientation?: (typeof _ARIA_ORIENTATION)[keyof typeof _ARIA_ORIENTATION];
    activedescendant?: string;
  } = {},
): Record<string, string | boolean> => {
  const attrs: Record<string, string | boolean> = {
    role: ARIA_ROLES.LISTBOX,
    "aria-label": label,
  };

  if (options.multiselectable !== undefined) {
    attrs["aria-multiselectable"] = options.multiselectable;
  }
  if (options.orientation) {
    attrs["aria-orientation"] = options.orientation;
  }
  if (options.activedescendant) {
    attrs["aria-activedescendant"] = options.activedescendant;
  }

  return attrs;
};

/**
 * Build accessibility props for table sorting
 * @param columnName - Name of the column
 * @param currentSort - Current sort state
 * @returns Object with aria attributes for sortable header
 */
export const buildSortableHeaderA11y = (
  columnName: string,
  currentSort: "none" | "ascending" | "descending",
): Record<string, string> => {
  return {
    role: ARIA_ROLES.COLUMNHEADER,
    "aria-sort": currentSort,
    "aria-label": `${columnName}, ${
      currentSort === "none"
        ? "não ordenado"
        : currentSort === "ascending"
          ? "ordenado em ordem crescente"
          : "ordenado em ordem decrescente"
    }`,
  };
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AriaRole = (typeof ARIA_ROLES)[keyof typeof ARIA_ROLES];
export type AriaState = (typeof ARIA_STATES)[keyof typeof ARIA_STATES];
export type AriaLiveValue = (typeof ARIA_LIVE)[keyof typeof ARIA_LIVE];
export type AriaAutocompleteValue =
  (typeof ARIA_AUTOCOMPLETE)[keyof typeof ARIA_AUTOCOMPLETE];
export type AriaSortValue = (typeof ARIA_SORT)[keyof typeof ARIA_SORT];
export type AriaOrientationValue =
  (typeof ARIA_ORIENTATION)[keyof typeof ARIA_ORIENTATION];
export type AriaHaspopupValue =
  (typeof ARIA_HASPOPUP)[keyof typeof ARIA_HASPOPUP];
export type AriaRelevantValue =
  (typeof ARIA_RELEVANT)[keyof typeof ARIA_RELEVANT];
export type AriaDropeffectValue =
  (typeof ARIA_DROPEFFECT)[keyof typeof ARIA_DROPEFFECT];
export type AriaAttrName =
  (typeof ARIA_ATTR_NAMES)[keyof typeof ARIA_ATTR_NAMES];
export type AriaLabel = (typeof ARIA_LABELS)[keyof typeof ARIA_LABELS];
