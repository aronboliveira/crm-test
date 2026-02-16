/**
 * User as returned by the JWT / /auth/me endpoint — used by PolicyService and AuthService.
 */
export interface SessionUser {
  sub: string;
  email: string;
  roles: readonly string[];
  perms: readonly string[];
}

/**
 * Lightweight user profile — used by Pinia auth store.
 */
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  twoFactorEnabled?: boolean;
}

export interface ProfilePreferences {
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    browser: boolean;
    taskDue: boolean;
    mentions: boolean;
    security: boolean;
    product: boolean;
  };
  updatedAt?: string;
}

/**
 * Server response from /auth/login.
 */
export interface LoginResponse {
  accessToken: string;
  user: SessionUser | UserProfile;
}

/**
 * Shared response shape for force-reset / invite endpoints.
 */
export interface ResetResponse {
  devResetToken?: string;
}

/* ─── OAuth / SSO ─── */

export type OAuthProvider = "google" | "microsoft" | "nextcloud";

export interface OAuthLinkedProvider {
  provider: OAuthProvider;
  email?: string;
  linkedAt: string;
  lastUsedAt?: string;
}

export interface OAuthProviderAvailability {
  provider: OAuthProvider;
  enabled: boolean;
  reason?: string;
}
