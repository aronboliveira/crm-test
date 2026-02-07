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
  name?: string;
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
