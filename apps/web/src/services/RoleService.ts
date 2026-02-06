import StorageService from "./StorageService";
import type { UserRole } from "../types/roles";

export default class RoleService {
  static #KEY = "auth.role";

  static get(): UserRole {
    const v = StorageService.session.getStr(RoleService.#KEY, "admin");
    return RoleService.#isRole(v) ? v : "admin";
  }

  static set(v: UserRole): void {
    StorageService.session.setStr(RoleService.#KEY, v);
  }

  static #isRole(v: string): v is UserRole {
    return v === "admin" || v === "manager" || v === "member" || v === "viewer";
  }
}
