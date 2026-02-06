import { DeepFreeze } from "@corp/foundations";
import AuthService from "./AuthService";
import type { PermissionKey } from "../types/permissions.types";

export type { PermissionKey };

export default class PolicyService {
  static #ready = false;

  static #DICT = DeepFreeze.apply({
    keys: {
      projectsRead: "projects.read" as PermissionKey,
      projectsWrite: "projects.write" as PermissionKey,
      tasksWrite: "tasks.write" as PermissionKey,
    },
  });

  static async bootstrap(): Promise<void> {
    try {
      // Check if user is authenticated and has permissions loaded
      const me = AuthService.me();
      PolicyService.#ready = !!(me && Array.isArray(me.perms));
    } catch (error) {
      console.error("[PolicyService] Bootstrap failed:", error);
      PolicyService.#ready = false;
    }
  }

  static isReady(): boolean {
    return PolicyService.#ready;
  }

  static can(perm: PermissionKey): boolean {
    try {
      if (!perm || typeof perm !== "string") {
        console.warn("[PolicyService] Invalid permission key");
        return false;
      }

      const me = AuthService.me();
      if (!me || !Array.isArray(me.perms)) {
        return false;
      }

      return me.perms.includes(perm);
    } catch (error) {
      console.error(
        `[PolicyService] Failed to check permission "${perm}":`,
        error,
      );
      return false;
    }
  }

  static any(...perms: readonly PermissionKey[]): boolean {
    try {
      if (!perms || perms.length === 0) {
        return false;
      }
      return perms.some((p) => PolicyService.can(p));
    } catch (error) {
      console.error("[PolicyService] Failed to check any permissions:", error);
      return false;
    }
  }
}
