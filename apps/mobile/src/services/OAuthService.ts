import { Linking } from "react-native";

import ApiClientService from "./ApiClientService";
import AlertService from "./AlertService";
import type {
  OAuthProvider,
  OAuthProviderAvailability,
} from "../types/auth.types";

const API_BASE_URL =
  ((globalThis as any)?.API_BASE_URL as string | undefined) ||
  "http://10.0.2.2:3000";

export default class OAuthService {
  static async getProviderAvailability(): Promise<OAuthProviderAvailability[]> {
    const response = await ApiClientService.raw.get("/auth/oauth/providers");
    return (response.data || []) as OAuthProviderAvailability[];
  }

  static async initiateLogin(provider: OAuthProvider): Promise<void> {
    const url = `${API_BASE_URL}/auth/oauth/${provider}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error("Não foi possível abrir o provedor OAuth");
      }

      await AlertService.info(
        "Redirecionando",
        `Conectando com ${provider} no navegador...`,
      );
      await Linking.openURL(url);
    } catch (error) {
      console.error("[OAuthService] initiateLogin failed:", error);
      await AlertService.error(
        "SSO indisponível",
        "Falha ao iniciar autenticação externa",
      );
      throw error;
    }
  }
}
