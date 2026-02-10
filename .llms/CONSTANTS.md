# Frontend Constants Documentation

## Overview

The frontend uses deeply frozen TypeScript dictionaries to manage DOM-related constants. These provide type safety, consistency, and prevent accidental mutations while making the codebase easier to maintain.

## Location

All constants are located in:
```
apps/web/src/utils/constants/
├── index.ts                    # Main exports
├── dom-classes.ts              # CSS class tokens
├── dom-ids.ts                  # HTML element IDs
├── dom-titles.ts               # Title attributes
├── dom-data-attrs.ts           # data-* attributes
├── dom-aria.ts                 # ARIA attributes
└── integration-constants.ts    # Integration-specific
```

## Deep Freezing

All constants use `ObjectDeep.freeze()` from `../ObjectDeep.ts`:

```typescript
import ObjectDeep, { type DeepReadonly } from "../ObjectDeep";

const _MY_CONSTANTS = {
  KEY_ONE: "value-one",
  KEY_TWO: "value-two",
} as const;

export const MY_CONSTANTS: DeepReadonly<typeof _MY_CONSTANTS> =
  ObjectDeep.freeze(_MY_CONSTANTS);
```

This ensures:
1. Type safety with `as const`
2. Runtime immutability with `Object.freeze()`
3. Deep readonly type with `DeepReadonly<T>`

## CSS Classes (`dom-classes.ts`)

### State Classes

```typescript
import { 
  LOADING_STATE_CLASSES,
  VISIBILITY_CLASSES,
  INTERACTIVE_CLASSES,
  VALIDATION_CLASSES,
  ANIMATION_CLASSES,
} from "@/utils/constants";

// Usage
element.classList.add(LOADING_STATE_CLASSES.LOADING);  // "is-loading"
element.classList.add(VISIBILITY_CLASSES.HIDDEN);       // "is-hidden"
element.classList.add(INTERACTIVE_CLASSES.DISABLED);    // "is-disabled"
```

### Component Classes

```typescript
import {
  CARD_CLASSES,
  BUTTON_CLASSES,
  FORM_CLASSES,
  TABLE_CLASSES,
  MODAL_CLASSES,
  NAV_CLASSES,
  BADGE_CLASSES,
  ALERT_CLASSES,
  INTEGRATION_CLASSES,
  STATUS_CLASSES,
} from "@/utils/constants";
```

### Utility Classes

```typescript
import {
  LAYOUT_CLASSES,
  SPACING_CLASSES,
  ALIGNMENT_CLASSES,
  TYPOGRAPHY_CLASSES,
  A11Y_CLASSES,
  RESPONSIVE_CLASSES,
} from "@/utils/constants";
```

### Aggregated Exports

```typescript
import {
  STATE_CLASSES,      // All state-related classes
  COMPONENT_CLASSES,  // All component classes
  UTILITY_CLASSES,    // All utility classes
  CSS_CLASSES,        // Master dictionary
} from "@/utils/constants";
```

## Element IDs (`dom-ids.ts`)

### Structure IDs

```typescript
import {
  APP_IDS,
  NAV_IDS,
  ADMIN_IDS,
} from "@/utils/constants";

// Usage
<div id={APP_IDS.ROOT}>
<nav id={NAV_IDS.SIDEBAR}>
```

### Page IDs

```typescript
import {
  DASHBOARD_IDS,
  PROJECTS_IDS,
  TASKS_IDS,
  LEADS_IDS,
  CLIENTS_IDS,
  INTEGRATION_IDS,
} from "@/utils/constants";
```

### Dynamic ID Generators

```typescript
import {
  getIntegrationCardId,
  getIntegrationHeaderId,
  getIntegrationBodyId,
} from "@/utils/constants";

// Usage
const cardId = getIntegrationCardId("glpi");  // "integration-card-glpi"
const headerId = getIntegrationHeaderId("glpi");  // "integration-card-glpi-header"
```

### Form IDs

```typescript
import {
  AUTH_IDS,
  ENTITY_FORM_IDS,
} from "@/utils/constants";
```

## Title Attributes (`dom-titles.ts`)

### Action Titles (Portuguese)

```typescript
import {
  ACTION_TITLES,
  NAV_TITLES,
  FORM_TITLES,
  TABLE_TITLES,
  MODAL_TITLES,
} from "@/utils/constants";

// Usage
<button title={ACTION_TITLES.SAVE}>Salvar</button>
<button title={FORM_TITLES.SHOW_PASSWORD}>👁</button>
```

### Integration Titles

```typescript
import { INTEGRATION_TITLES } from "@/utils/constants";

// Usage
<button title={INTEGRATION_TITLES.TEST_CONNECTION}>Testar</button>
<span title={INTEGRATION_TITLES.STATUS_CONNECTED}>●</span>
```

### Dynamic Title Generators

```typescript
import {
  getIntegrationCardTitle,
  getExpandableTitle,
  getSortableHeaderTitle,
} from "@/utils/constants";

// Usage
const title = getIntegrationCardTitle("GLPI", "connected");
// "GLPI - Conectado. Clique para expandir ou recolher"
```

## Data Attributes (`dom-data-attrs.ts`)

### State Tracking

```typescript
import {
  STATE_DATA_ATTRS,
  VALIDATION_DATA_ATTRS,
} from "@/utils/constants";

// Usage
<div data-loading-state="loading">
<input data-validation="invalid" data-error-code="required">
```

### Entity Tracking

```typescript
import {
  ENTITY_DATA_ATTRS,
  PROJECT_DATA_ATTRS,
  TASK_DATA_ATTRS,
  INTEGRATION_DATA_ATTRS,
} from "@/utils/constants";

// Usage
<div 
  data-entity-type="project"
  data-project-id="123"
  data-project-status="active"
>
```

### UI Components

```typescript
import {
  TABLE_DATA_ATTRS,
  MODAL_DATA_ATTRS,
  DROPDOWN_DATA_ATTRS,
  DND_DATA_ATTRS,
  NAV_DATA_ATTRS,
} from "@/utils/constants";
```

### Helper Functions

```typescript
import {
  dataAttr,
  dataSelector,
  toDatasetKey,
  buildDataAttrs,
  parseDataset,
} from "@/utils/constants";

// Build attribute name
dataAttr("loading-state")  // "data-loading-state"

// Build CSS selector
dataSelector("status", "connected")  // '[data-status="connected"]'

// Convert to dataset key
toDatasetKey("loading-state")  // "loadingState"

// Build props object
buildDataAttrs({ status: "active", id: "123" })
// { "data-status": "active", "data-id": "123" }

// Parse from element
parseDataset(element, ["status", "id"])
// { status: "active", id: "123" }
```

## ARIA Attributes (`dom-aria.ts`)

### ARIA Roles

```typescript
import { ARIA_ROLES } from "@/utils/constants";

// Usage
<nav role={ARIA_ROLES.NAVIGATION}>
<dialog role={ARIA_ROLES.DIALOG}>
```

### ARIA States and Properties

```typescript
import {
  ARIA_STATES,
  ARIA_LIVE,
  ARIA_SORT,
  ARIA_HASPOPUP,
} from "@/utils/constants";

// Usage
<button aria-expanded={ARIA_STATES.TRUE}>
<div aria-live={ARIA_LIVE.POLITE}>
<th aria-sort={ARIA_SORT.ASCENDING}>
```

### ARIA Labels (Portuguese)

```typescript
import { ARIA_LABELS } from "@/utils/constants";

// Usage
<nav aria-label={ARIA_LABELS.MAIN_NAVIGATION}>
<button aria-label={ARIA_LABELS.CLOSE}>×</button>
```

### Helper Functions

```typescript
import {
  ariaAttr,
  buildAriaAttrs,
  buildButtonA11y,
  buildDialogA11y,
  buildListboxA11y,
  buildSortableHeaderA11y,
} from "@/utils/constants";

// Build button accessibility
const buttonProps = buildButtonA11y("Fechar menu", {
  expanded: true,
  controls: "menu-content",
  haspopup: "menu",
});
// { "aria-label": "Fechar menu", "aria-expanded": true, ... }

// Build dialog accessibility
const dialogProps = buildDialogA11y("dialog-title", "dialog-desc", true);
// { role: "dialog", "aria-labelledby": "...", "aria-modal": true, ... }
```

## Integration Constants (`integration-constants.ts`)

### Integration Definitions

```typescript
import {
  INTEGRATIONS,
  getIntegration,
  getAllIntegrations,
  getIntegrationsByCategory,
} from "@/utils/constants";

// Get specific integration
const glpi = getIntegration("glpi");

// Get all as array
const all = getAllIntegrations();

// Filter by category
const emails = getIntegrationsByCategory("email");
```

### Integration Icons

```typescript
import {
  INTEGRATION_ICONS,
  getIntegrationIcon,
} from "@/utils/constants";

// Get SVG string
const icon = getIntegrationIcon("headphones");
```

### Configuration Fields

```typescript
import {
  GLPI_CONFIG_FIELDS,
  SAT_CONFIG_FIELDS,
  NEXTCLOUD_CONFIG_FIELDS,
} from "@/utils/constants";

// Use for form generation
SAT_CONFIG_FIELDS.forEach(field => {
  // field.key, field.label, field.type, field.required
});
```

### Status Helpers

```typescript
import {
  STATUS_LABELS,
  getStatusLabel,
  hasFeature,
} from "@/utils/constants";

getStatusLabel("connected")  // "Conectado"
hasFeature("sat", "invoices")  // true
```

## Usage in Vue Components

### Importing Constants

```vue
<script setup lang="ts">
import {
  CARD_CLASSES,
  INTEGRATION_IDS,
  ACTION_TITLES,
  STATE_DATA_ATTRS,
  ARIA_LABELS,
  getIntegrationCardId,
} from "@/utils/constants";

const cardId = computed(() => getIntegrationCardId(props.integration.id));
</script>

<template>
  <article
    :id="cardId"
    :class="CARD_CLASSES.CARD"
    :title="ACTION_TITLES.VIEW"
    :data-loading-state="STATE_DATA_ATTRS.LOADING_STATE"
    :aria-label="ARIA_LABELS.INTEGRATION_STATUS"
  >
    <!-- ... -->
  </article>
</template>
```

### Type-Safe Props

```typescript
import type { IntegrationStatus, ButtonClass } from "@/utils/constants";

const props = defineProps<{
  status: IntegrationStatus;
  buttonVariant: ButtonClass;
}>();
```

## Benefits

1. **Consistency**: Same values used across all components
2. **Type Safety**: TypeScript catches typos at compile time
3. **Immutability**: Cannot be accidentally modified
4. **Discoverability**: IDE autocomplete shows all options
5. **Maintainability**: Change in one place affects everywhere
6. **Documentation**: Constants serve as documentation
7. **Refactoring**: Easy to rename or change values
