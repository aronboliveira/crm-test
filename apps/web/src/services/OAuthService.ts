import ApiClientService from "./ApiClientService";
import type {
  OAuthProvider,
  OAuthLinkedProvider,
  OAuthProviderAvailability,
} from "../types/auth.types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Frontend service for SSO / OAuth operations.
 *
 * Initiation is done via plain URL redirect (the browser navigates to the
 * NestJS OAuth endpoint which in turn redirects to the provider).
 *
 * After the provider round-trip the backend redirects to
 * `/oauth/callback?token=<jwt>&provider=<name>` on the frontend, which is
 * handled by `AuthOAuthCallbackPage.vue`.
 */
const OAuthService = {
  /**
   * Navigate the browser to the backend OAuth initiation endpoint.
   * The user will be redirected to the provider's consent screen.
   */
  initiateLogin(provider: OAuthProvider): void {
    window.location.href = `${API_BASE}/auth/oauth/${provider}`;
  },

  async getProviderAvailability(): Promise<OAuthProviderAvailability[]> {
    const res = await ApiClientService.raw.get("/auth/oauth/providers");
    return (res.data || []) as OAuthProviderAvailability[];
  },

  /**
   * Return the list of OAuth providers linked to the current user's account.
   */
  async getLinkedProviders(): Promise<OAuthLinkedProvider[]> {
    const res = await ApiClientService.raw.get("/auth/oauth/linked");
    return (res.data || []) as OAuthLinkedProvider[];
  },

  /**
   * Unlink an OAuth provider from the current user's account.
   */
  async unlinkProvider(provider: OAuthProvider): Promise<{ ok: boolean }> {
    const res = await ApiClientService.raw.delete(
      `/auth/oauth/linked/${provider}`,
    );
    return res.data as { ok: boolean };
  },
} as const;

export default OAuthService;
