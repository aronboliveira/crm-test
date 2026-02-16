/**
 * Validation rule constants
 *
 * Frozen dictionary of validation rules for forms.
 * Ensures consistent validation across the application.
 *
 * @example
 * ```typescript
 * if (email.length < VALIDATION_RULES.EMAIL.MIN_LENGTH) {
 *   // Error
 * }
 * if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
 *   // Invalid format
 * }
 * ```
 */

import DeepFreeze from "../utils/deepFreeze";

const _VALIDATION_RULES = {
  /** Email validation */
  EMAIL: {
    /** Minimum length */
    MIN_LENGTH: 5,
    /** Maximum length */
    MAX_LENGTH: 254,
    /** Email pattern regex */
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    /** Error message */
    ERROR_MESSAGE: "Please enter a valid email address",
  },

  /** Password validation */
  PASSWORD: {
    /** Minimum length */
    MIN_LENGTH: 8,
    /** Maximum length */
    MAX_LENGTH: 128,
    /** Require uppercase */
    REQUIRE_UPPERCASE: true,
    /** Require lowercase */
    REQUIRE_LOWERCASE: true,
    /** Require number */
    REQUIRE_NUMBER: true,
    /** Require special character */
    REQUIRE_SPECIAL: true,
    /** Special characters pattern */
    SPECIAL_CHARS_PATTERN: /[!@#$%^&*(),.?":{}|<>]/,
    /** Error message */
    ERROR_MESSAGE:
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
  },

  /** Username validation */
  USERNAME: {
    /** Minimum length */
    MIN_LENGTH: 3,
    /** Maximum length */
    MAX_LENGTH: 30,
    /** Allowed pattern */
    PATTERN: /^[a-zA-Z0-9_-]+$/,
    /** Error message */
    ERROR_MESSAGE:
      "Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores",
  },

  /** Name validation */
  NAME: {
    /** Minimum length */
    MIN_LENGTH: 2,
    /** Maximum length */
    MAX_LENGTH: 100,
    /** Allowed pattern */
    PATTERN: /^[a-zA-ZÀ-ÿ\s'-]+$/,
    /** Error message */
    ERROR_MESSAGE:
      "Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes",
  },

  /** Phone validation */
  PHONE: {
    /** Minimum length */
    MIN_LENGTH: 10,
    /** Maximum length */
    MAX_LENGTH: 15,
    /** Phone pattern (international) */
    PATTERN: /^\+?[1-9]\d{1,14}$/,
    /** Error message */
    ERROR_MESSAGE: "Please enter a valid phone number",
  },

  /** Project validation */
  PROJECT: {
    /** Name min length */
    NAME_MIN_LENGTH: 3,
    /** Name max length */
    NAME_MAX_LENGTH: 100,
    /** Description max length */
    DESCRIPTION_MAX_LENGTH: 1000,
  },

  /** Task validation */
  TASK: {
    /** Title min length */
    TITLE_MIN_LENGTH: 3,
    /** Title max length */
    TITLE_MAX_LENGTH: 200,
    /** Description max length */
    DESCRIPTION_MAX_LENGTH: 2000,
  },

  /** Client validation */
  CLIENT: {
    /** Name min length */
    NAME_MIN_LENGTH: 2,
    /** Name max length */
    NAME_MAX_LENGTH: 100,
    /** Company max length */
    COMPANY_MAX_LENGTH: 100,
  },
} as const;

/**
 * Frozen validation rules dictionary
 * All rules are immutable and type-safe
 */
export const VALIDATION_RULES = DeepFreeze.apply(_VALIDATION_RULES);

/**
 * Type helper for validation rules
 */
export type ValidationRules = typeof _VALIDATION_RULES;

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || email.length < VALIDATION_RULES.EMAIL.MIN_LENGTH) {
    return { valid: false, error: "Email is too short" };
  }

  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return { valid: false, error: "Email is too long" };
  }

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return { valid: false, error: VALIDATION_RULES.EMAIL.ERROR_MESSAGE };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
    };
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return { valid: false, error: "Password is too long" };
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (VALIDATION_RULES.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  if (
    VALIDATION_RULES.PASSWORD.REQUIRE_SPECIAL &&
    !VALIDATION_RULES.PASSWORD.SPECIAL_CHARS_PATTERN.test(password)
  ) {
    return {
      valid: false,
      error: "Password must contain at least one special character",
    };
  }

  return { valid: true };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = phone.replace(/\s+/g, "");

  if (cleaned.length < VALIDATION_RULES.PHONE.MIN_LENGTH) {
    return { valid: false, error: "Phone number is too short" };
  }

  if (cleaned.length > VALIDATION_RULES.PHONE.MAX_LENGTH) {
    return { valid: false, error: "Phone number is too long" };
  }

  if (!VALIDATION_RULES.PHONE.PATTERN.test(cleaned)) {
    return { valid: false, error: VALIDATION_RULES.PHONE.ERROR_MESSAGE };
  }

  return { valid: true };
}
