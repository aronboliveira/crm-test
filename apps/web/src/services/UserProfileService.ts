import ApiClientService from "./ApiClientService";
import type { ProfilePreferences, UserProfile } from "../types/auth.types";

type NotificationsPayload = Readonly<{
  email?: boolean;
  browser?: boolean;
  taskDue?: boolean;
  mentions?: boolean;
  security?: boolean;
  product?: boolean;
}>;

export default class UserProfileService {
  static async getProfile(): Promise<UserProfile> {
    const response = await ApiClientService.raw.get("/users/me/profile");
    return response.data as UserProfile;
  }

  static async updateProfile(
    payload: Readonly<{
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      jobTitle?: string;
      timezone?: string;
      locale?: string;
      bio?: string;
    }>,
  ): Promise<UserProfile> {
    const response = await ApiClientService.raw.patch(
      "/users/me/profile",
      payload,
    );
    return response.data as UserProfile;
  }

  static async uploadAvatar(
    file: File,
  ): Promise<Readonly<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await ApiClientService.raw.post(
      "/users/me/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data as Readonly<{ avatarUrl: string }>;
  }

  static async getPreferences(): Promise<ProfilePreferences> {
    const response = await ApiClientService.raw.get("/users/me/preferences");
    return response.data as ProfilePreferences;
  }

  static async updatePreferences(
    payload: Readonly<{
      theme?: ProfilePreferences["theme"];
      notifications?: NotificationsPayload;
    }>,
  ): Promise<ProfilePreferences> {
    const response = await ApiClientService.raw.patch(
      "/users/me/preferences",
      payload,
    );
    return response.data as ProfilePreferences;
  }

  static async changePassword(
    payload: Readonly<{
      currentPassword: string;
      newPassword: string;
    }>,
  ): Promise<Readonly<{ ok: boolean }>> {
    const response = await ApiClientService.raw.patch(
      "/auth/change-password",
      payload,
    );
    return response.data as Readonly<{ ok: boolean }>;
  }

  static async getTwoFactorStatus(): Promise<Readonly<{ enabled: boolean }>> {
    const response = await ApiClientService.raw.get("/auth/2fa/status");
    return response.data as Readonly<{ enabled: boolean }>;
  }

  static async setupTwoFactor(): Promise<
    Readonly<{ secret: string; otpauthUrl: string }>
  > {
    const response = await ApiClientService.raw.post("/auth/2fa/setup");
    return response.data as Readonly<{ secret: string; otpauthUrl: string }>;
  }

  static async enableTwoFactor(
    code: string,
  ): Promise<Readonly<{ ok: boolean; recoveryCodes: string[] }>> {
    const response = await ApiClientService.raw.post("/auth/2fa/enable", {
      code,
    });
    return response.data as Readonly<{ ok: boolean; recoveryCodes: string[] }>;
  }

  static async disableTwoFactor(
    code: string,
  ): Promise<Readonly<{ ok: boolean }>> {
    const response = await ApiClientService.raw.post("/auth/2fa/disable", {
      code,
    });
    return response.data as Readonly<{ ok: boolean }>;
  }

  static async exportMyData(): Promise<Readonly<Record<string, unknown>>> {
    const response = await ApiClientService.raw.get("/users/me/export");
    return response.data as Readonly<Record<string, unknown>>;
  }

  static async deleteMyAccount(
    password: string,
  ): Promise<Readonly<{ ok: boolean }>> {
    const response = await ApiClientService.raw.delete("/users/me", {
      data: { password },
    });
    return response.data as Readonly<{ ok: boolean }>;
  }
}
