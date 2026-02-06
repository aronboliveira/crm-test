import axios, { type AxiosInstance, type AxiosError } from "axios";
import AuthService from "./AuthService";
import type { CreateDTO, UpdateDTO } from "../types/api.types";

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

          const tok = AuthService.token();
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

  static setToken(token: string): void {
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
}
