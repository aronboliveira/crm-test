import axios, { type AxiosError, type AxiosInstance } from "axios";
import { v4 as uuidv4 } from "uuid";

import AuthService from "./AuthService";
import { authEvents } from "./AuthEvents";
import type { CreateDTO, UpdateDTO } from "../types/api.types";

// Replace this with react-native-config / expo-constants / your own config layer.
const API_BASE_URL =
  (globalThis as any)?.API_BASE_URL || "http://10.0.2.2:3000"; // Android emulator default

class ApiClient {
  #ax: AxiosInstance;

  constructor(baseURL: string) {
    if (!baseURL) throw new Error("[ApiClient] baseURL is required");

    this.#ax = axios.create({ baseURL, timeout: 10_000 });

    this.#ax.interceptors.request.use(
      (cfg) => {
        try {
          cfg.headers = cfg.headers || {};

          // crypto.randomUUID() is not guaranteed in RN; use uuid
          (cfg.headers as any)["X-Request-Id"] =
            (cfg.headers as any)["X-Request-Id"] || uuidv4();

          const tok = AuthService.token();
          if (tok && !(cfg.headers as any)["Authorization"]) {
            (cfg.headers as any)["Authorization"] = `Bearer ${tok}`;
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

          // window.dispatchEvent(...) doesn't exist in RN
          if (st === 401 && !/\/auth\/login\b/.test(url)) {
            console.warn("[ApiClient] Authentication expired");
            authEvents.emit("expired");
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

const api = new ApiClient(API_BASE_URL);

export default class ApiClientService {
  static raw = api.raw;

  static setToken(_token: string): void {
    // Token is set via interceptor using AuthService
  }

  static auth = {
    me: async () => {
      const response = await api.raw.get("/auth/me");
      return response.data;
    },
  };

  static projects = {
    list: async () => (await api.raw.get("/projects")).data,
    options: async (q?: { activeOnly?: 0 | 1 }) =>
      (await api.raw.get("/projects/options", { params: q })).data,
    create: async (dto: CreateDTO) =>
      (await api.raw.post("/projects", dto)).data,
    update: async (id: string, dto: UpdateDTO) =>
      (await api.raw.patch(`/projects/${encodeURIComponent(id)}`, dto)).data,
    remove: async (id: string) =>
      (await api.raw.delete(`/projects/${encodeURIComponent(id)}`)).data,
  };

  static tasks = {
    list: async () => (await api.raw.get("/tasks")).data,
    create: async (dto: CreateDTO) => (await api.raw.post("/tasks", dto)).data,
    update: async (id: string, dto: UpdateDTO) =>
      (await api.raw.patch(`/tasks/${encodeURIComponent(id)}`, dto)).data,
    remove: async (id: string) =>
      (await api.raw.delete(`/tasks/${encodeURIComponent(id)}`)).data,
  };
}
