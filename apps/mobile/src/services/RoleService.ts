import StorageService from "./StorageService";
import type { UserRole } from "../types/roles";

export default class RoleService {
  static #KEY = "auth.role";
  static #cache: UserRole | null = null;

  /**
   * Call once on app startup (or before first usage).
   * Loads from session storage into memory.
   */
  static async bootstrap(): Promise<UserRole> {
    const v = await StorageService.session.getStr(RoleService.#KEY, "admin");
    const role = RoleService.#isRole(v) ? v : "admin";
    RoleService.#cache = role;
    return role;
  }

  /**
   * Read current role.
   * - Returns cached value if bootstrap() already ran
   * - Otherwise returns default ("admin") without hitting storage
   */
  static get(): UserRole {
    return RoleService.#cache ?? "admin";
  }

  /**
   * Read role directly from storage (useful if you don’t want caching).
   */
  static async getAsync(): Promise<UserRole> {
    const v = await StorageService.session.getStr(RoleService.#KEY, "admin");
    const role = RoleService.#isRole(v) ? v : "admin";
    RoleService.#cache = role;
    return role;
  }

  static async set(v: UserRole): Promise<void> {
    RoleService.#cache = v;
    await StorageService.session.setStr(RoleService.#KEY, v);
  }

  static clearCache(): void {
    RoleService.#cache = null;
  }

  static #isRole(v: string): v is UserRole {
    return v === "admin" || v === "manager" || v === "member" || v === "viewer";
  }
}
