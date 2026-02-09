import StorageService from "./StorageService";
import ApiClientService from "./ApiClientService";
import type { SessionUser, LoginResponse } from "../types/auth.types";

/**
 * Authentication service for managing user sessions.
 * Handles login, logout, token storage, and session state.
 *
 * @example
 * ```typescript
 * await AuthService.login('user@example.com', 'password');
 * const user = AuthService.me();
 * AuthService.logout();
 * ```
 */
export default class AuthService {
  static #TK = "auth.token";
  static #ME = "auth.me";
  static #ready = false;

  /**
   * Initializes the authentication service on app startup.
   * Validates existing session data and sets ready state.
   */
  static async bootstrap(): Promise<void> {
    try {
      const token = AuthService.token();
      const user = AuthService.me();
      AuthService.#ready = !!(token && user);
    } catch (error) {
      console.error("[AuthService] Bootstrap failed:", error);
      AuthService.#ready = false;
    }
  }

  /**
   * Checks if the auth service has been bootstrapped.
   * @returns True if service is ready for use
   */
  static isReady(): boolean {
    return AuthService.#ready;
  }

  /**
   * Retrieves the current authentication token.
   * @returns The JWT token or null if not authenticated
   */
  static token(): string | null {
    try {
      const t = StorageService.session.getStr(AuthService.#TK, "");
      return t || null;
    } catch (error) {
      console.error("[AuthService] Failed to get token:", error);
      return null;
    }
  }

  /**
   * Checks if the user is currently authenticated.
   * @returns True if a valid token exists
   */
  static isAuthed(): boolean {
    return !!AuthService.token();
  }

  /**
   * Retrieves the current authenticated user's data.
   * @returns The session user object or null if not authenticated
   */
  static me(): SessionUser | null {
    try {
      const stored = StorageService.session.getJson<SessionUser>(
        AuthService.#ME,
        {} as SessionUser,
      );
      if (stored && typeof stored === "object" && "email" in stored) {
        return stored;
      }
      return null;
    } catch (error) {
      console.error("[AuthService] Failed to get user data:", error);
      return null;
    }
  }

  /**
   * Authenticates a user with email and password.
   * @param email - The user's email address
   * @param password - The user's password
   * @throws Error if credentials are invalid or request fails
   */
  static async login(email: string, password: string): Promise<void> {
    try {
      if (!email || typeof email !== "string") {
        throw new Error("Email is required");
      }
      if (!password || typeof password !== "string") {
        throw new Error("Password is required");
      }

      const body = { email: email.trim().toLowerCase(), password };

      const resp = await ApiClientService.raw.post<LoginResponse>(
        "/auth/login",
        body,
      );
      const tok = resp.data?.accessToken;

      if (!tok) {
        throw new Error("No access token received from server");
      }

      StorageService.session.setStr(AuthService.#TK, tok);

      if (resp.data?.user) {
        StorageService.session.setJson(AuthService.#ME, resp.data.user);
      } else {
        console.warn("[AuthService] No user data received in login response");
        StorageService.session.del(AuthService.#ME);
      }
    } catch (error) {
      console.error("[AuthService] Login failed:", error);
      StorageService.session.del(AuthService.#TK);
      StorageService.session.del(AuthService.#ME);
      throw error;
    }
  }

  /**
   * Logs out the current user by clearing session data.
   */
  static logout(): void {
    try {
      StorageService.session.del(AuthService.#TK);
      StorageService.session.del(AuthService.#ME);
    } catch (error) {
      console.error("[AuthService] Logout failed:", error);
    }
  }
}
