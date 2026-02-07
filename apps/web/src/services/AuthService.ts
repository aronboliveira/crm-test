import StorageService from "./StorageService";
import ApiClientService from "./ApiClientService";
import type { SessionUser, LoginResponse } from "../types/auth.types";

export default class AuthService {
  static #TK = "auth.token";
  static #ME = "auth.me";
  static #ready = false;

  static async bootstrap(): Promise<void> {
    try {
      // Check if user has valid auth token and session data
      const token = AuthService.token();
      const user = AuthService.me();
      AuthService.#ready = !!(token && user);
    } catch (error) {
      console.error("[AuthService] Bootstrap failed:", error);
      AuthService.#ready = false;
    }
  }

  static isReady(): boolean {
    return AuthService.#ready;
  }

  static token(): string | null {
    try {
      const t = StorageService.session.getStr(AuthService.#TK, "");
      return t || null;
    } catch (error) {
      console.error("[AuthService] Failed to get token:", error);
      return null;
    }
  }

  static isAuthed(): boolean {
    return !!AuthService.token();
  }

  static me(): SessionUser | null {
    try {
      const stored = StorageService.session.getJson<SessionUser>(
        AuthService.#ME,
        {} as SessionUser,
      );
      // Check if the stored value is a valid SessionUser
      if (stored && typeof stored === "object" && "email" in stored) {
        return stored;
      }
      return null;
    } catch (error) {
      console.error("[AuthService] Failed to get user data:", error);
      return null;
    }
  }

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

  static logout(): void {
    try {
      StorageService.session.del(AuthService.#TK);
      StorageService.session.del(AuthService.#ME);
    } catch (error) {
      console.error("[AuthService] Logout failed:", error);
    }
  }
}
