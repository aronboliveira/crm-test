/**
 * Theme constants
 *
 * Frozen dictionary of colors, spacing, typography, and other theme values.
 * Ensures consistent design language across the mobile application.
 *
 * @example
 * ```typescript
 * const styles = StyleSheet.create({
 *   container: {
 *     padding: THEME.SPACING.MD,
 *     backgroundColor: THEME.COLORS.BACKGROUND.PRIMARY,
 *   },
 *   text: {
 *     fontSize: THEME.TYPOGRAPHY.SIZES.MD,
 *     fontWeight: THEME.TYPOGRAPHY.WEIGHTS.SEMIBOLD,
 *   },
 * });
 * ```
 */

import DeepFreeze from "../utils/deepFreeze";

const _THEME = {
  /** Color palette */
  COLORS: {
    /** Primary brand colors */
    PRIMARY: {
      DEFAULT: "#007AFF",
      LIGHT: "#4DA3FF",
      DARK: "#0051A8",
    },

    /** Secondary colors */
    SECONDARY: {
      DEFAULT: "#5856D6",
      LIGHT: "#8685E8",
      DARK: "#3634A3",
    },

    /** Success states */
    SUCCESS: {
      DEFAULT: "#34C759",
      LIGHT: "#6EDB88",
      DARK: "#248A3D",
    },

    /** Warning states */
    WARNING: {
      DEFAULT: "#FF9500",
      LIGHT: "#FFB340",
      DARK: "#CC7700",
    },

    /** Error states */
    ERROR: {
      DEFAULT: "#FF3B30",
      LIGHT: "#FF6961",
      DARK: "#D62B20",
    },

    /** Info states */
    INFO: {
      DEFAULT: "#007AFF",
      LIGHT: "#4DA3FF",
      DARK: "#0051A8",
    },

    /** Background colors */
    BACKGROUND: {
      PRIMARY: "#FFFFFF",
      SECONDARY: "#F2F2F7",
      TERTIARY: "#E5E5EA",
      DARK: "#000000",
      OVERLAY: "rgba(0, 0, 0, 0.5)",
    },

    /** Text colors */
    TEXT: {
      PRIMARY: "#000000",
      SECONDARY: "#3C3C43",
      TERTIARY: "#787880",
      DISABLED: "#C7C7CC",
      INVERSE: "#FFFFFF",
    },

    /** Border colors */
    BORDER: {
      DEFAULT: "#C6C6C8",
      LIGHT: "#E5E5EA",
      DARK: "#8E8E93",
    },

    /** Semantic colors */
    STATUS: {
      ACTIVE: "#34C759",
      INACTIVE: "#8E8E93",
      PENDING: "#FF9500",
      ARCHIVED: "#C7C7CC",
    },
  },

  /** Spacing scale (in pixels) */
  SPACING: {
    XXS: 2,
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
    XXXL: 64,
  },

  /** Border radius scale */
  RADIUS: {
    NONE: 0,
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    FULL: 9999,
  },

  /** Typography */
  TYPOGRAPHY: {
    /** Font sizes */
    SIZES: {
      XXS: 10,
      XS: 12,
      SM: 14,
      MD: 16,
      LG: 18,
      XL: 20,
      XXL: 24,
      XXXL: 32,
      XXXXL: 40,
    },

    /** Font weights */
    WEIGHTS: {
      LIGHT: "300" as const,
      REGULAR: "400" as const,
      MEDIUM: "500" as const,
      SEMIBOLD: "600" as const,
      BOLD: "700" as const,
      EXTRABOLD: "800" as const,
      BLACK: "900" as const,
    },

    /** Line heights */
    LINE_HEIGHTS: {
      TIGHT: 1.2,
      NORMAL: 1.5,
      RELAXED: 1.75,
      LOOSE: 2,
    },

    /** Letter spacing */
    LETTER_SPACING: {
      TIGHT: -0.5,
      NORMAL: 0,
      WIDE: 0.5,
      WIDER: 1,
    },
  },

  /** Shadows */
  SHADOWS: {
    SM: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    MD: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    LG: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    XL: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  /** Z-index layers */
  Z_INDEX: {
    BACKGROUND: -1,
    BASE: 0,
    DROPDOWN: 1000,
    STICKY: 1100,
    OVERLAY: 1200,
    MODAL: 1300,
    POPOVER: 1400,
    TOAST: 1500,
    TOOLTIP: 1600,
  },

  /** Animation durations (ms) */
  DURATIONS: {
    INSTANT: 0,
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
  },

  /** Animation timing functions */
  EASINGS: {
    LINEAR: "linear" as const,
    EASE_IN: "ease-in" as const,
    EASE_OUT: "ease-out" as const,
    EASE_IN_OUT: "ease-in-out" as const,
  },
} as const;

/**
 * Frozen theme constants dictionary
 * All theme values are immutable and type-safe
 */
export const THEME = DeepFreeze.apply(_THEME);

/**
 * Type helper for theme values
 */
export type Theme = typeof _THEME;

/**
 * Dark mode theme (future implementation)
 */
export const DARK_THEME = DeepFreeze.apply({
  ..._THEME,
  COLORS: {
    ..._THEME.COLORS,
    BACKGROUND: {
      PRIMARY: "#000000",
      SECONDARY: "#1C1C1E",
      TERTIARY: "#2C2C2E",
      DARK: "#FFFFFF",
      OVERLAY: "rgba(255, 255, 255, 0.1)",
    },
    TEXT: {
      PRIMARY: "#FFFFFF",
      SECONDARY: "#EBEBF5",
      TERTIARY: "#EBEBF599",
      DISABLED: "#3A3A3C",
      INVERSE: "#000000",
    },
  },
});
