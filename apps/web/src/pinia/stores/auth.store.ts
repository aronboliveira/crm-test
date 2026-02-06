import { defineStore } from "pinia";
import RetryRunner from "../foundations/RetryRunner";
import ApiClientService from "../../services/ApiClientService";
import type { UserProfile, LoginResponse } from "../../types/auth.types";

type nlStr = string | null;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    ready: false,
    token: null as nlStr,
    me: null as UserProfile | null,
  }),

  getters: {
    isReady: (s) => !!s.ready,
    isLoggedIn: (s) => !!s.token,
  },

  actions: {
    async bootstrap(): Promise<void> {
      try {
        const tok = (() => {
          try {
            return sessionStorage.getItem("_auth_token_v1");
          } catch (error) {
            console.warn(
              "[AuthStore] Failed to read token from sessionStorage:",
              error,
            );
            return null;
          }
        })();

        if (tok) {
          this.token = tok;
          if (ApiClientService.setToken) {
            ApiClientService.setToken(tok);
          }
        }

        const rr = new RetryRunner(10, 120);
        const me = await rr.run(
          async () => {
            if (!tok) return null;
            try {
              const response = await ApiClientService.raw.get("/api/me");
              return response.data as UserProfile;
            } catch (error) {
              console.warn("[AuthStore] Failed to fetch user data:", error);
              return null;
            }
          },
          (v) => v !== null,
        );

        this.me = me;
        this.ready = true;
      } catch (error) {
        console.error("[AuthStore] Bootstrap failed:", error);
        this.ready = true;
      }
    },

    async login(
      payload: Readonly<{ email: string; password: string }>,
    ): Promise<void> {
      try {
        const email = String(payload?.email || "")
          .trim()
          .toLowerCase();
        const password = String(payload?.password || "");

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        const response = await ApiClientService.raw.post("/auth/login", {
          email,
          password,
        });
        const data = response.data as LoginResponse;
        const tok = data?.accessToken;

        if (!tok) {
          throw new Error("Missing access token in response");
        }

        try {
          sessionStorage.setItem("_auth_token_v1", tok);
        } catch (error) {
          console.warn(
            "[AuthStore] Failed to save token to sessionStorage:",
            error,
          );
        }

        if (ApiClientService.setToken) {
          ApiClientService.setToken(tok);
        }

        this.token = tok;
        this.me = (data.user || null) as any; // ? compiler bug, so we force here
        this.ready = true;
      } catch (error) {
        console.error("[AuthStore] Login failed:", error);
        throw error;
      }
    },

    async logout(): Promise<void> {
      try {
        try {
          sessionStorage.removeItem("_auth_token_v1");
        } catch (error) {
          console.warn(
            "[AuthStore] Failed to remove token from sessionStorage:",
            error,
          );
        }

        if (ApiClientService.setToken) {
          ApiClientService.setToken("");
        }

        this.token = null;
        this.me = null;
        this.ready = true;
      } catch (error) {
        console.error("[AuthStore] Logout failed:", error);
      }
    },
  },
});
