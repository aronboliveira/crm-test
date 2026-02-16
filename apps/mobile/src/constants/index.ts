/**
 * Mobile Constants
 *
 * Central export point for all frozen constant dictionaries.
 * Import specific constants or the entire module as needed.
 *
 * @example
 * ```typescript
 * // Import specific constants
 * import { NAV_ROUTES, STORAGE_KEYS, THEME } from '@/constants';
 *
 * // Or import individual modules
 * import { NAV_ROUTES } from '@/constants/nav-routes.constants';
 * ```
 */

// Navigation
export {
  NAV_ROUTES,
  getAllRouteNames,
  isValidRoute,
  type NavRoute,
} from "./nav-routes.constants";

// Storage
export {
  STORAGE_KEYS,
  getAllStorageKeys,
  isValidStorageKey,
  getAuthKeys,
  getCacheKeys,
  type StorageKey,
} from "./storage-keys.constants";

// Theme
export { THEME, DARK_THEME, type Theme } from "./theme.constants";

// Validation
export {
  VALIDATION_RULES,
  validateEmail,
  validatePassword,
  validatePhone,
  type ValidationRules,
} from "./validation-rules.constants";
