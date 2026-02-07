import axios, { type AxiosInstance, type AxiosError } from "axios";
import type { CreateDTO, UpdateDTO } from "../types/api.types";

// Token storage key - must match auth.store.ts
const AUTH_TOKEN_KEY = "_auth_token_v1";

function getToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

class ApiClient {
  #ax: AxiosInstance;

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

  get raw(): AxiosInstance {
    return this.#ax;
  }
}

const api = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
);

export default class ApiClientService {
  static raw = api.raw;

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
  };

  /* ── Import ───────────────────────────────────────────────── */

  static import = {
    upload: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.raw.post("/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      });
      return r.data;
    },
  };
}
