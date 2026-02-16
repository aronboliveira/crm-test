import axios, { type AxiosInstance, type AxiosError } from "axios";
import type { CreateDTO, UpdateDTO } from "../types/api.types";
import type {
  DeviceAnalyticsQuery,
  DeviceAnalyticsResponse,
  DeviceListQuery,
  DeviceListResponse,
} from "../pinia/types/devices.types";

/** Storage key for authentication token, must match auth.store.ts */
const AUTH_TOKEN_KEY = "_auth_token_v1";

/**
 * Retrieves the authentication token from session storage.
 * @returns The stored token or null if not found
 */
function getToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Low-level HTTP client wrapper around Axios.
 * Handles request/response interceptors for authentication and error handling.
 */
class ApiClient {
  #ax: AxiosInstance;

  /**
   * Creates a new ApiClient instance.
   * @param baseURL - The base URL for all API requests
   * @throws Error if baseURL is not provided
   */
  constructor(baseURL: string) {
    if (!baseURL) {
      throw new Error("[ApiClient] baseURL is required");
    }

    this.#ax = axios.create({ baseURL, timeout: 10_000 });

    this.#ax.interceptors.request.use(
      (cfg) => {
        try {
          cfg.headers = cfg.headers || {};
          cfg.headers["X-Request-Id"] =
            cfg.headers["X-Request-Id"] || crypto.randomUUID();

          const tok = getToken();
          if (tok && !cfg.headers["Authorization"]) {
            cfg.headers["Authorization"] = `Bearer ${tok}`;
          }

          return cfg;
        } catch (error) {
          console.error("[ApiClient] Request interceptor failed:", error);
          return cfg;
        }
      },
      (error) => {
        console.error("[ApiClient] Request interceptor error:", error);
        return Promise.reject(error);
      },
    );

    this.#ax.interceptors.response.use(
      (v) => v,
      (err: AxiosError) => {
        try {
          const st = err?.response?.status;
          const url = String(err?.config?.url ?? "");

          if (st === 401 && !/\/auth\/login\b/.test(url)) {
            console.warn(
              "[ApiClient] Authentication expired, dispatching event",
            );
            window.dispatchEvent(new CustomEvent("auth:expired"));
          }

          if (st && st >= 500) {
            console.error(`[ApiClient] Server error ${st} for ${url}:`, err);
          }
        } catch (error) {
          console.error("[ApiClient] Response interceptor error:", error);
        }

        return Promise.reject(err);
      },
    );
  }

  /** Returns the underlying Axios instance for direct access. */
  get raw(): AxiosInstance {
    return this.#ax;
  }
}

export type ImportTemplateKind =
  | "clients"
  | "projects"
  | "users"
  | "tasks"
  | "leads";

export type ImportTemplateVersionSnapshot = Readonly<{
  version: number;
  createdAt: string;
  createdByEmail: string;
  changeNote?: string;
  profileKey?: string;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues: Readonly<Record<string, string>>;
}>;

export type ImportTemplateRecord = Readonly<{
  id: string;
  kind: ImportTemplateKind;
  name: string;
  description?: string;
  profileKey?: string;
  latestVersion: number;
  usageCount: number;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues: Readonly<Record<string, string>>;
  versions: readonly ImportTemplateVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  updatedByEmail: string;
}>;

export type ImportSourceProfile = Readonly<{
  key: string;
  label: string;
  description: string;
  kind: ImportTemplateKind;
  columnMapping: Readonly<Record<string, string>>;
  defaultValues: Readonly<Record<string, string>>;
}>;

export type ImportFieldSuggestion = Readonly<{
  value: string;
  score: number;
}>;

export type ImportFieldSuggestionsItem = Readonly<{
  field: string;
  suggestions: readonly ImportFieldSuggestion[];
}>;

const api = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
);

/**
 * High-level API client service for making HTTP requests to the backend.
 * Provides typed methods for all CRM resources (auth, projects, tasks, clients, leads).
 *
 * @example
 * ```typescript
 * const user = await ApiClientService.auth.me();
 * const projects = await ApiClientService.projects.list();
 * ```
 */
export default class ApiClientService {
  /** Direct access to the Axios instance for custom requests. */
  static raw = api.raw;

  /**
   * Sets the authentication token (compatibility method).
   * @param _token - The token to set (handled via interceptor)
   */
  static setToken(_token: string): void {
    // Token is set via interceptor using AuthService
    // This method exists for compatibility
  }

  static auth = {
    me: async () => {
      try {
        const response = await api.raw.get("/auth/me");
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.auth.me] Request failed:", error);
        throw error;
      }
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      try {
        const response = await api.raw.patch("/auth/change-password", {
          currentPassword,
          newPassword,
        });
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.auth.changePassword] Request failed:",
          error,
        );
        throw error;
      }
    },

    changeEmail: async (newEmail: string, password: string) => {
      try {
        const response = await api.raw.post("/auth/change-email", {
          newEmail,
          password,
        });
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.auth.changeEmail] Request failed:",
          error,
        );
        throw error;
      }
    },
  };

  static projects = {
    list: async () => {
      try {
        const response = await api.raw.get("/projects");
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.projects.list] Request failed:",
          error,
        );
        throw error;
      }
    },
    options: async (q?: { activeOnly?: 0 | 1 }) => {
      try {
        const response = await api.raw.get("/projects/options", { params: q });
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.projects.options] Request failed:",
          error,
        );
        throw error;
      }
    },
    create: async (dto: CreateDTO) => {
      try {
        if (!dto || typeof dto !== "object") {
          throw new Error("Invalid DTO provided");
        }
        const response = await api.raw.post("/projects", dto);
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.projects.create] Request failed:",
          error,
        );
        throw error;
      }
    },
    update: async (id: string, dto: UpdateDTO) => {
      try {
        if (!id || typeof id !== "string")
          throw new Error("Invalid project ID");
        if (!dto || typeof dto !== "object") throw new Error("Invalid DTO");
        const response = await api.raw.patch(
          `/projects/${encodeURIComponent(id)}`,
          dto,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.projects.update] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
    remove: async (id: string) => {
      try {
        if (!id || typeof id !== "string")
          throw new Error("Invalid project ID");
        const response = await api.raw.delete(
          `/projects/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.projects.remove] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
  };

  static tasks = {
    list: async () => {
      try {
        const response = await api.raw.get("/tasks");
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.tasks.list] Request failed:", error);
        throw error;
      }
    },
    create: async (dto: CreateDTO) => {
      try {
        if (!dto || typeof dto !== "object") {
          throw new Error("Invalid DTO provided");
        }
        const response = await api.raw.post("/tasks", dto);
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.tasks.create] Request failed:", error);
        throw error;
      }
    },
    update: async (id: string, dto: UpdateDTO) => {
      try {
        if (!id || typeof id !== "string") throw new Error("Invalid task ID");
        if (!dto || typeof dto !== "object") throw new Error("Invalid DTO");
        const response = await api.raw.patch(
          `/tasks/${encodeURIComponent(id)}`,
          dto,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.tasks.update] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
    remove: async (id: string) => {
      try {
        if (!id || typeof id !== "string") throw new Error("Invalid task ID");
        const response = await api.raw.delete(
          `/tasks/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.tasks.remove] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
    updateSubtasks: async (id: string, subtasks: any[]) => {
      try {
        if (!id || typeof id !== "string") throw new Error("Invalid task ID");
        const response = await api.raw.patch(
          `/tasks/${encodeURIComponent(id)}/subtasks`,
          { subtasks },
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.tasks.updateSubtasks] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
  };

  static clients = {
    list: async () => {
      try {
        const response = await api.raw.get("/clients");
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.clients.list] Request failed:", error);
        throw error;
      }
    },

    get: async (id: string) => {
      try {
        const response = await api.raw.get(
          `/clients/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.clients.get] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    create: async (payload: any) => {
      try {
        const response = await api.raw.post("/clients", payload);
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.clients.create] Request failed:",
          error,
        );
        throw error;
      }
    },

    update: async (id: string, payload: any) => {
      try {
        const response = await api.raw.patch(`/clients/${id}`, payload);
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.clients.update] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    remove: async (id: string) => {
      try {
        const response = await api.raw.delete(`/clients/${id}`);
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.clients.remove] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
  };

  static devices = {
    list: async (params?: DeviceListQuery) => {
      try {
        const response = await api.raw.get("/devices", { params });
        return response.data as DeviceListResponse;
      } catch (error) {
        console.error("[ApiClientService.devices.list] Request failed:", error);
        throw error;
      }
    },

    analytics: async (params?: DeviceAnalyticsQuery) => {
      try {
        const response = await api.raw.get("/devices/analytics", { params });
        return response.data as DeviceAnalyticsResponse;
      } catch (error) {
        console.error(
          "[ApiClientService.devices.analytics] Request failed:",
          error,
        );
        throw error;
      }
    },

    get: async (id: string) => {
      try {
        if (!id || typeof id !== "string") {
          throw new Error("Invalid device ID");
        }
        const response = await api.raw.get(
          `/devices/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.devices.get] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    create: async (payload: any) => {
      try {
        const response = await api.raw.post("/devices", payload);
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.devices.create] Request failed:",
          error,
        );
        throw error;
      }
    },

    update: async (id: string, payload: any) => {
      try {
        if (!id || typeof id !== "string") {
          throw new Error("Invalid device ID");
        }
        const response = await api.raw.patch(
          `/devices/${encodeURIComponent(id)}`,
          payload,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.devices.update] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    remove: async (id: string) => {
      try {
        if (!id || typeof id !== "string") {
          throw new Error("Invalid device ID");
        }
        const response = await api.raw.delete(
          `/devices/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.devices.remove] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },
  };

  /* ── Dashboard ────────────────────────────────────────────── */

  static dashboard = {
    growth: async (params?: {
      window?: 3 | 6 | 12;
      metrics?: readonly ("projects" | "tasks" | "clients")[];
      owner?: string;
      statuses?: readonly string[];
    }) => {
      try {
        const query: Record<string, string> = {};
        if (params?.window) {
          query.window = String(params.window);
        }
        if (Array.isArray(params?.metrics) && params.metrics.length > 0) {
          query.metrics = params.metrics.join(",");
        }
        if (typeof params?.owner === "string" && params.owner.trim()) {
          query.owner = params.owner.trim();
        }
        if (Array.isArray(params?.statuses) && params.statuses.length > 0) {
          query.status = params.statuses
            .map((status) => String(status || "").trim())
            .filter(Boolean)
            .join(",");
        }
        const response = await api.raw.get("/dashboard/growth", {
          params: query,
        });
        return response.data;
      } catch (error) {
        console.error(
          "[ApiClientService.dashboard.growth] Request failed:",
          error,
        );
        throw error;
      }
    },
  };

  /* ── Leads ────────────────────────────────────────────────── */

  static leads = {
    list: async (q?: string, status?: string) => {
      try {
        const response = await api.raw.get("/leads", {
          params: { q, status },
        });
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.leads.list] Request failed:", error);
        throw error;
      }
    },

    get: async (id: string) => {
      try {
        const response = await api.raw.get(`/leads/${encodeURIComponent(id)}`);
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.get] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    create: async (payload: any) => {
      try {
        const response = await api.raw.post("/leads", payload);
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.leads.create] Request failed:", error);
        throw error;
      }
    },

    update: async (id: string, payload: any) => {
      try {
        const response = await api.raw.patch(
          `/leads/${encodeURIComponent(id)}`,
          payload,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.update] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    remove: async (id: string) => {
      try {
        const response = await api.raw.delete(
          `/leads/${encodeURIComponent(id)}`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.remove] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    attachCampaign: async (id: string, campaign: any) => {
      try {
        const response = await api.raw.post(
          `/leads/${encodeURIComponent(id)}/campaigns`,
          campaign,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.attachCampaign] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    detachCampaign: async (id: string, campaignId: string) => {
      try {
        const response = await api.raw.delete(
          `/leads/${encodeURIComponent(id)}/campaigns/${encodeURIComponent(campaignId)}`,
        );
        return response.data;
      } catch (error) {
        console.error(`[ApiClientService.leads.detachCampaign] Failed:`, error);
        throw error;
      }
    },

    attachContract: async (id: string, contract: any) => {
      try {
        const response = await api.raw.post(
          `/leads/${encodeURIComponent(id)}/contracts`,
          contract,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.attachContract] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    detachContract: async (id: string, contractId: string) => {
      try {
        const response = await api.raw.delete(
          `/leads/${encodeURIComponent(id)}/contracts/${encodeURIComponent(contractId)}`,
        );
        return response.data;
      } catch (error) {
        console.error(`[ApiClientService.leads.detachContract] Failed:`, error);
        throw error;
      }
    },

    refreshCta: async (id: string, channels?: string[]) => {
      try {
        const response = await api.raw.post(
          `/leads/${encodeURIComponent(id)}/cta/refresh`,
          { channels },
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.leads.refreshCta] Failed for ID ${id}:`,
          error,
        );
        throw error;
      }
    },

    markCtaUsed: async (id: string, ctaId: string) => {
      try {
        const response = await api.raw.patch(
          `/leads/${encodeURIComponent(id)}/cta/${encodeURIComponent(ctaId)}/used`,
        );
        return response.data;
      } catch (error) {
        console.error(`[ApiClientService.leads.markCtaUsed] Failed:`, error);
        throw error;
      }
    },
  };

  /* ── Messages ─────────────────────────────────────────────── */

  static messages = {
    logEvent: async (payload: any) => {
      try {
        const response = await api.raw.post("/messages/events", payload);
        return response.data;
      } catch (error) {
        console.error("[ApiClientService.messages.logEvent] Failed:", error);
        throw error;
      }
    },

    getClientAnalytics: async (clientId: string) => {
      try {
        const response = await api.raw.get(
          `/messages/clients/${encodeURIComponent(clientId)}/analytics`,
        );
        return response.data;
      } catch (error) {
        console.error(
          `[ApiClientService.messages.getClientAnalytics] Failed for ID ${clientId}:`,
          error,
        );
        throw error;
      }
    },
  };

  /* ── Comments ─────────────────────────────────────────────── */

  static comments = {
    list: async (targetType: string, targetId: string) => {
      const r = await api.raw.get("/comments", {
        params: { targetType, targetId },
      });
      return r.data;
    },
    create: async (dto: Record<string, unknown>) => {
      const r = await api.raw.post("/comments", dto);
      return r.data;
    },
    remove: async (id: string) => {
      const r = await api.raw.delete(`/comments/${encodeURIComponent(id)}`);
      return r.data;
    },
  };

  /* ── Notes ────────────────────────────────────────────────── */

  static notes = {
    list: async (targetType: string, targetId: string) => {
      const r = await api.raw.get("/notes", {
        params: { targetType, targetId },
      });
      return r.data;
    },
    create: async (dto: Record<string, unknown>) => {
      const r = await api.raw.post("/notes", dto);
      return r.data;
    },
    remove: async (id: string) => {
      const r = await api.raw.delete(`/notes/${encodeURIComponent(id)}`);
      return r.data;
    },
  };

  /* ── Attachments ──────────────────────────────────────────── */

  static attachments = {
    list: async (targetType: string, targetId: string) => {
      const r = await api.raw.get("/attachments", {
        params: { targetType, targetId },
      });
      return r.data;
    },
    upload: async (file: File, targetType: string, targetId: string) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetType", targetType);
      fd.append("targetId", targetId);
      const r = await api.raw.post("/attachments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      });
      return r.data;
    },
    downloadUrl: (id: string) =>
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/attachments/${id}/download`,
    remove: async (id: string) => {
      const r = await api.raw.delete(`/attachments/${encodeURIComponent(id)}`);
      return r.data;
    },
  };

  /* ── Tags ─────────────────────────────────────────────────── */

  static tags = {
    list: async () => {
      const r = await api.raw.get("/tags");
      return r.data;
    },
    create: async (dto: { key: string; label: string; color: string }) => {
      const r = await api.raw.post("/tags", dto);
      return r.data;
    },
    remove: async (id: string) => {
      const r = await api.raw.delete(`/tags/${encodeURIComponent(id)}`);
      return r.data;
    },
  };

  /* ── Milestones ───────────────────────────────────────────── */

  static milestones = {
    list: async (projectId: string) => {
      const r = await api.raw.get("/milestones", {
        params: { projectId },
      });
      return r.data;
    },
    create: async (dto: Record<string, unknown>) => {
      const r = await api.raw.post("/milestones", dto);
      return r.data;
    },
    update: async (id: string, dto: Record<string, unknown>) => {
      const r = await api.raw.patch(
        `/milestones/${encodeURIComponent(id)}`,
        dto,
      );
      return r.data;
    },
    remove: async (id: string) => {
      const r = await api.raw.delete(`/milestones/${encodeURIComponent(id)}`);
      return r.data;
    },
  };

  /* ── Project Templates ────────────────────────────────────── */

  static templates = {
    list: async () => {
      const r = await api.raw.get("/project-templates");
      return r.data;
    },
    getByKey: async (key: string) => {
      const r = await api.raw.get(
        `/project-templates/${encodeURIComponent(key)}`,
      );
      return r.data;
    },
    create: async (payload: Readonly<Record<string, unknown>>) => {
      const r = await api.raw.post("/project-templates", payload);
      return r.data;
    },
  };

  /* ── Import ───────────────────────────────────────────────── */

  static import = {
    upload: async (
      file: File,
      options?: Readonly<{
        duplicateStrategy?:
          | "skip-duplicates"
          | "update-on-match"
          | "strict-fail";
      }>,
    ) => {
      const fd = new FormData();
      fd.append("file", file);
      if (options?.duplicateStrategy) {
        fd.append("duplicateStrategy", options.duplicateStrategy);
      }
      const r = await api.raw.post("/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      });
      return r.data;
    },
    listTemplates: async (kind?: ImportTemplateKind) => {
      const r = await api.raw.get("/import/templates", {
        params: kind ? { kind } : undefined,
      });
      return (r.data ?? { items: [] }) as { items: ImportTemplateRecord[] };
    },
    getTemplate: async (id: string) => {
      const r = await api.raw.get(
        `/import/templates/${encodeURIComponent(id)}`,
      );
      return r.data as ImportTemplateRecord;
    },
    createTemplate: async (payload: Readonly<Record<string, unknown>>) => {
      const r = await api.raw.post("/import/templates", payload);
      return r.data as { id: string; latestVersion: number; name: string };
    },
    updateTemplate: async (
      id: string,
      payload: Readonly<Record<string, unknown>>,
    ) => {
      const r = await api.raw.patch(
        `/import/templates/${encodeURIComponent(id)}`,
        payload,
      );
      return r.data as {
        id: string;
        latestVersion: number;
        name: string;
        updatedAt: string;
      };
    },
    deleteTemplate: async (id: string) => {
      const r = await api.raw.delete(
        `/import/templates/${encodeURIComponent(id)}`,
      );
      return r.data as { ok: boolean };
    },
    markTemplateUsed: async (id: string) => {
      const r = await api.raw.post(
        `/import/templates/${encodeURIComponent(id)}/mark-used`,
      );
      return r.data as { id: string; usageCount: number };
    },
    previewTemplateApply: async (
      id: string,
      payload: Readonly<Record<string, unknown>>,
    ) => {
      const r = await api.raw.post(
        `/import/templates/${encodeURIComponent(id)}/preview-apply`,
        payload,
      );
      return r.data as Readonly<{
        templateId: string;
        templateName: string;
        targetVersion: number;
        targetProfileKey?: string;
        targetColumnMapping: Readonly<Record<string, string>>;
        targetDefaultValues: Readonly<Record<string, string>>;
        diff: Readonly<{
          mapping: Readonly<{
            added: ReadonlyArray<{ key: string; to?: string }>;
            removed: ReadonlyArray<{ key: string; from?: string }>;
            changed: ReadonlyArray<{ key: string; from?: string; to?: string }>;
          }>;
          defaults: Readonly<{
            added: ReadonlyArray<{ key: string; to?: string }>;
            removed: ReadonlyArray<{ key: string; from?: string }>;
            changed: ReadonlyArray<{ key: string; from?: string; to?: string }>;
          }>;
          summary: Readonly<{
            mappingChanged: boolean;
            defaultsChanged: boolean;
            mappingDeltaCount: number;
            defaultsDeltaCount: number;
          }>;
        }>;
      }>;
    },
    listProfiles: async (kind: ImportTemplateKind) => {
      const r = await api.raw.get("/import/templates/profiles", {
        params: { kind },
      });
      return (r.data ?? { items: [] }) as { items: ImportSourceProfile[] };
    },
    listFieldSuggestions: async (
      kind: ImportTemplateKind,
      params?: Readonly<{ field?: string; query?: string; limit?: number }>,
    ) => {
      const r = await api.raw.get("/import/suggestions", {
        params: {
          kind,
          ...(params?.field ? { field: params.field } : {}),
          ...(params?.query ? { query: params.query } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      });
      return (r.data ?? { kind, items: [] }) as {
        kind: ImportTemplateKind;
        items: ImportFieldSuggestionsItem[];
      };
    },
  };
}
