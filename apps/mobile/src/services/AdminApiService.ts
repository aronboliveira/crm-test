import ApiClientService from "./ApiClientService";
import type {
  AdminUserDetails,
  AdminUserRow,
  AuditEventRow,
  MailOutboxItem,
  PagedResult,
} from "../types/admin.types";

export type { MailOutboxItem };

export default class AdminApiService {
  static async usersList(
    params: Readonly<{
      q?: string;
      roleKey?: string;
      cursor?: string;
      limit?: number;
    }>,
  ): Promise<PagedResult<AdminUserRow>> {
    try {
      const response = await ApiClientService.raw.get("/admin/users", {
        params,
      });
      return response.data as PagedResult<AdminUserRow>;
    } catch (error) {
      console.error("[AdminApiService.usersList] Request failed:", error);
      throw error;
    }
  }

  static async projectsList(
    params: Readonly<{ q?: string; cursor?: string; limit?: number }>,
  ): Promise<PagedResult<Record<string, unknown>>> {
    try {
      const response = await ApiClientService.raw.get("/projects", {
        params,
      });
      return response.data as PagedResult<Record<string, unknown>>;
    } catch (error) {
      console.error("[AdminApiService.projectsList] Request failed:", error);
      throw error;
    }
  }

  static async tasksList(
    params: Readonly<{
      q?: string;
      cursor?: string;
      limit?: number;
      projectId?: string;
    }>,
  ): Promise<PagedResult<Record<string, unknown>>> {
    try {
      const response = await ApiClientService.raw.get("/tasks", {
        params,
      });
      return response.data as PagedResult<Record<string, unknown>>;
    } catch (error) {
      console.error("[AdminApiService.tasksList] Request failed:", error);
      throw error;
    }
  }

  static async userSetRole(id: string, roleKey: string): Promise<unknown> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      if (!roleKey || typeof roleKey !== "string") {
        throw new Error("Invalid role key");
      }
      const response = await ApiClientService.raw.patch(
        `/admin/users/${encodeURIComponent(id)}/role`,
        { roleKey },
      );
      return response.data;
    } catch (error) {
      console.error(
        `[AdminApiService.userSetRole] Failed for user ${id}:`,
        error,
      );
      throw error;
    }
  }

  static async userForceReset(id: string): Promise<{ devResetToken?: string }> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      const response = await ApiClientService.raw.post(
        `/admin/users/${encodeURIComponent(id)}/force-reset`,
      );
      return (response.data ?? {}) as { devResetToken?: string };
    } catch (error) {
      console.error(
        `[AdminApiService.userForceReset] Failed for user ${id}:`,
        error,
      );
      throw error;
    }
  }

  static async auditList(
    params: Readonly<{
      q?: string;
      kind?: string;
      cursor?: string;
      limit?: number;
    }>,
  ): Promise<PagedResult<AuditEventRow>> {
    try {
      const response = await ApiClientService.raw.get("/admin/audit", {
        params,
      });
      return response.data as PagedResult<AuditEventRow>;
    } catch (error) {
      console.error("[AdminApiService.auditList] Request failed:", error);
      throw error;
    }
  }

  static async userDetails(id: string): Promise<AdminUserDetails> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      const response = await ApiClientService.raw.get(
        `/admin/users/${encodeURIComponent(id)}`,
      );
      return response.data as AdminUserDetails;
    } catch (error) {
      console.error(
        `[AdminApiService.userDetails] Failed for user ${id}:`,
        error,
      );
      throw error;
    }
  }

  static async auditForTargetUser(
    targetUserId: string,
    limit = 50,
  ): Promise<{ items?: readonly Record<string, unknown>[] }> {
    try {
      if (!targetUserId || typeof targetUserId !== "string") {
        throw new Error("Invalid target user ID");
      }
      const response = await ApiClientService.raw.get("/admin/audit", {
        params: { targetUserId, limit },
      });
      return response.data;
    } catch (error) {
      console.error(
        `[AdminApiService.auditForTargetUser] Failed for user ${targetUserId}:`,
        error,
      );
      throw error;
    }
  }

  static async userLock(id: string, reason: string): Promise<unknown> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      if (!reason || typeof reason !== "string") {
        throw new Error("Lock reason is required");
      }
      const response = await ApiClientService.raw.post(
        `/admin/users/${encodeURIComponent(id)}/lock`,
        { reason },
      );
      return response.data;
    } catch (error) {
      console.error(`[AdminApiService.userLock] Failed for user ${id}:`, error);
      throw error;
    }
  }

  static async userUnlock(id: string): Promise<unknown> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      const response = await ApiClientService.raw.post(
        `/admin/users/${encodeURIComponent(id)}/unlock`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[AdminApiService.userUnlock] Failed for user ${id}:`,
        error,
      );
      throw error;
    }
  }

  static async userCreate(
    payload: Readonly<{ email: string; roleKey: string }>,
  ): Promise<{ invite?: { resetUrl?: string; devResetToken?: string } }> {
    try {
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid payload");
      }
      if (!payload.email || typeof payload.email !== "string") {
        throw new Error("Email is required");
      }
      if (!payload.roleKey || typeof payload.roleKey !== "string") {
        throw new Error("Role key is required");
      }
      const response = await ApiClientService.raw.post("/admin/users", payload);
      return (response.data ?? {}) as {
        invite?: { resetUrl?: string; devResetToken?: string };
      };
    } catch (error) {
      console.error("[AdminApiService.userCreate] Request failed:", error);
      throw error;
    }
  }

  static async mailOutboxList(
    params: Readonly<{
      q?: string;
      kind?: string;
      cursor?: string;
      limit?: number;
    }>,
  ): Promise<PagedResult<MailOutboxItem>> {
    try {
      const response = await ApiClientService.raw.get("/admin/mail-outbox", {
        params,
      });
      return response.data as PagedResult<MailOutboxItem>;
    } catch (error) {
      console.error("[AdminApiService.mailOutboxList] Request failed:", error);
      throw error;
    }
  }

  static async mailOutboxRead(id: string): Promise<MailOutboxItem> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid mail outbox ID");
      }
      const response = await ApiClientService.raw.get(
        `/admin/mail-outbox/${encodeURIComponent(id)}`,
      );
      return response.data as MailOutboxItem;
    } catch (error) {
      console.error(
        `[AdminApiService.mailOutboxRead] Failed for ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  static async userReissueInvite(
    id: string,
  ): Promise<{ invite?: { resetUrl?: string; devResetToken?: string } }> {
    try {
      if (!id || typeof id !== "string") {
        throw new Error("Invalid user ID");
      }
      const response = await ApiClientService.raw.post(
        `/admin/users/${encodeURIComponent(id)}/reissue-invite`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[AdminApiService.userReissueInvite] Failed for user ${id}:`,
        error,
      );
      throw error;
    }
  }
}
