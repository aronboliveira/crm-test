/**
 * Storage key constants
 *
 * Frozen dictionary of all storage keys used for MMKV and AsyncStorage.
 * Prevents typos and ensures consistency across the application.
 *
 * @example
 * ```typescript
 * StorageService.session.setStr(STORAGE_KEYS.AUTH.TOKEN, token);
 * const user = StorageService.session.getJson(STORAGE_KEYS.AUTH.USER, null);
 * ```
 */

import DeepFreeze from "../utils/deepFreeze";

const _STORAGE_KEYS = {
  /** Authentication-related keys */
  AUTH: {
    /** JWT access token */
    TOKEN: "auth.token",
    /** Cached user session data */
    USER: "auth.me",
    /** Remember me flag */
    REMEMBER_ME: "auth.rememberMe",
    /** Last login email */
    LAST_EMAIL: "auth.lastEmail",
    /** Last recovery token (password reset) */
    LAST_TOKEN: "auth.recovery.last_token",
  },

  /** Form persistence keys */
  FORM: {
    /** Login form data */
    LOGIN: "form.auth_login_form",
    /** Forgot password form */
    FORGOT_PASSWORD: "form.auth_forgot_password_form",
    /** Reset password form */
    RESET_PASSWORD: "form.auth_reset_password_form",
    /** Project create/edit form */
    PROJECT: "form.project_form",
    /** Task create/edit form */
    TASK: "form.task_form",
    /** Client create/edit form */
    CLIENT: "form.client_form",
  },

  /** User preferences */
  PREFERENCES: {
    /** Theme mode (light/dark/auto) */
    THEME: "pref.theme",
    /** Language preference */
    LANGUAGE: "pref.language",
    /** Notification settings */
    NOTIFICATIONS: "pref.notifications",
    /** Onboarding completed flag */
    ONBOARDING_COMPLETE: "pref.onboardingComplete",
    /** Last sync timestamp */
    LAST_SYNC: "pref.lastSync",
  },

  /** Cache keys */
  CACHE: {
    /** Projects list cache */
    PROJECTS: "cache.projects",
    /** Tasks list cache */
    TASKS: "cache.tasks",
    /** Clients list cache */
    CLIENTS: "cache.clients",
    /** Leads list cache */
    LEADS: "cache.leads",
    /** User roles cache */
    ROLES: "cache.roles",
    /** Permissions cache */
    PERMISSIONS: "cache.permissions",
  },

  /** Query state keys */
  QUERY: {
    /** Dashboard query filters */
    DASHBOARD_FILTERS: "query.dashboard.filters",
    /** Projects query state */
    PROJECTS_QUERY: "query.projects",
    /** Tasks query state */
    TASKS_QUERY: "query.tasks",
    /** Clients query state */
    CLIENTS_QUERY: "query.clients",
  },

  /** Analytics keys */
  ANALYTICS: {
    /** User session ID */
    SESSION_ID: "analytics.sessionId",
    /** Install timestamp */
    INSTALL_DATE: "analytics.installDate",
    /** Last active timestamp */
    LAST_ACTIVE: "analytics.lastActive",
  },
} as const;

/**
 * Frozen storage keys dictionary
 * All keys are immutable and type-safe
 */
export const STORAGE_KEYS = DeepFreeze.apply(_STORAGE_KEYS);

/**
 * Type helper for storage key values
 */
export type StorageKey = typeof _STORAGE_KEYS;

/**
 * Get all storage keys as a flat array
 */
export function getAllStorageKeys(): string[] {
  const keys: string[] = [];

  for (const section of Object.values(_STORAGE_KEYS)) {
    for (const key of Object.values(section)) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Check if a key name is valid
 */
export function isValidStorageKey(key: string): boolean {
  return getAllStorageKeys().includes(key);
}

/**
 * Clear all auth-related storage
 */
export function getAuthKeys(): string[] {
  return Object.values(_STORAGE_KEYS.AUTH);
}

/**
 * Clear all cache keys
 */
export function getCacheKeys(): string[] {
  return Object.values(_STORAGE_KEYS.CACHE);
}
