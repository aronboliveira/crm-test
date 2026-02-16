import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import UserProfileService from "../../../services/UserProfileService";
import ThemeService from "../../../services/ThemeService";
import { useAuthStore } from "../../../pinia/stores/auth.store";
import type {
  ProfilePreferences,
  UserProfile,
} from "../../../types/auth.types";

export function useUserProfilePage() {
  const router = useRouter();
  const authStore = useAuthStore();

  const isLoading = ref(false);
  const isSavingProfile = ref(false);
  const isSavingPreferences = ref(false);
  const isChangingPassword = ref(false);
  const isExportingData = ref(false);
  const isDeletingAccount = ref(false);
  const isTwoFactorBusy = ref(false);
  const isUploadingAvatar = ref(false);
  const isEditMode = ref(false);
  const errorMessage = ref("");
  const successMessage = ref("");
  const profile = ref<UserProfile | null>(null);
  const preferences = ref<ProfilePreferences>({
    theme: "system",
    notifications: {
      email: true,
      browser: true,
      taskDue: true,
      mentions: true,
      security: true,
      product: false,
    },
  });
  const twoFactorEnabled = ref(false);
  const twoFactorSetupSecret = ref("");
  const twoFactorSetupOtpauthUrl = ref("");
  const twoFactorSetupCode = ref("");
  const twoFactorDisableCode = ref("");
  const twoFactorRecoveryCodes = ref<string[]>([]);
  const deleteAccountPassword = ref("");

  const profileForm = ref<{
    firstName: string;
    lastName: string;
    phone: string;
    department: string;
    jobTitle: string;
    timezone: string;
    locale: string;
    bio: string;
  }>({
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    jobTitle: "",
    timezone: "",
    locale: "",
    bio: "",
  });

  const passwordForm = ref<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const displayName = computed(() => {
    if (!profile.value) return "Usuário";

    const firstName = String(profile.value.firstName || "").trim();
    const lastName = String(profile.value.lastName || "").trim();

    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    return (
      String(profile.value.username || "").trim() ||
      String(profile.value.email || "").trim() ||
      "Usuário"
    );
  });

  const initials = computed(() => {
    const name = displayName.value;
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase();
  });

  const hasAvatar = computed(() => {
    const avatarUrl = String(profile.value?.avatarUrl || "").trim();
    return !!avatarUrl;
  });

  const themeMode = computed({
    get: () => preferences.value.theme,
    set: (mode: ProfilePreferences["theme"]) => {
      preferences.value = {
        ...preferences.value,
        theme: mode,
      };
    },
  });

  const hydrateForm = () => {
    profileForm.value = {
      firstName: String(profile.value?.firstName || ""),
      lastName: String(profile.value?.lastName || ""),
      phone: String(profile.value?.phone || ""),
      department: String(profile.value?.department || ""),
      jobTitle: String(profile.value?.jobTitle || ""),
      timezone: String(profile.value?.timezone || ""),
      locale: String(profile.value?.locale || ""),
      bio: String(profile.value?.bio || ""),
    };
  };

  const loadProfile = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      profile.value = await UserProfileService.getProfile();
      hydrateForm();

      preferences.value = await UserProfileService.getPreferences();
      ThemeService.setMode(preferences.value.theme);

      const twoFactor = await UserProfileService.getTwoFactorStatus();
      twoFactorEnabled.value = !!twoFactor.enabled;
    } catch (error) {
      console.error("[useUserProfilePage] Failed to load profile:", error);
      errorMessage.value = "Não foi possível carregar seu perfil.";
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    if (!file) return;

    isUploadingAvatar.value = true;
    errorMessage.value = "";

    try {
      const result = await UserProfileService.uploadAvatar(file);
      if (profile.value) {
        profile.value = {
          ...profile.value,
          avatarUrl: `${result.avatarUrl}?t=${Date.now()}`,
        };
      }
    } catch (error) {
      console.error("[useUserProfilePage] Failed to upload avatar:", error);
      errorMessage.value = "Falha ao enviar avatar. Tente novamente.";
    } finally {
      isUploadingAvatar.value = false;
    }
  };

  const enterEditMode = (): void => {
    errorMessage.value = "";
    successMessage.value = "";
    hydrateForm();
    isEditMode.value = true;
  };

  const cancelEditMode = (): void => {
    errorMessage.value = "";
    successMessage.value = "";
    isEditMode.value = false;
    hydrateForm();
  };

  const saveProfile = async (): Promise<void> => {
    isSavingProfile.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      profile.value = await UserProfileService.updateProfile(profileForm.value);
      hydrateForm();
      isEditMode.value = false;
      successMessage.value = "Perfil atualizado com sucesso.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to save profile:", error);
      errorMessage.value = "Falha ao salvar perfil.";
    } finally {
      isSavingProfile.value = false;
    }
  };

  const savePreferences = async (): Promise<void> => {
    isSavingPreferences.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      preferences.value = await UserProfileService.updatePreferences({
        theme: preferences.value.theme,
        notifications: preferences.value.notifications,
      });
      ThemeService.setMode(preferences.value.theme);
      successMessage.value = "Preferências atualizadas.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to save preferences:", error);
      errorMessage.value = "Falha ao salvar preferências.";
    } finally {
      isSavingPreferences.value = false;
    }
  };

  const changePassword = async (): Promise<void> => {
    errorMessage.value = "";
    successMessage.value = "";

    if (
      !passwordForm.value.currentPassword ||
      !passwordForm.value.newPassword
    ) {
      errorMessage.value = "Informe a senha atual e a nova senha.";
      return;
    }

    if (passwordForm.value.newPassword.length < 8) {
      errorMessage.value = "A nova senha deve conter ao menos 8 caracteres.";
      return;
    }

    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      errorMessage.value = "A confirmação da senha não confere.";
      return;
    }

    isChangingPassword.value = true;
    try {
      await UserProfileService.changePassword({
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
      });

      passwordForm.value = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };
      successMessage.value = "Senha alterada com sucesso.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to change password:", error);
      errorMessage.value = "Falha ao alterar senha.";
    } finally {
      isChangingPassword.value = false;
    }
  };

  const setupTwoFactor = async (): Promise<void> => {
    isTwoFactorBusy.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const result = await UserProfileService.setupTwoFactor();
      twoFactorSetupSecret.value = String(result.secret || "");
      twoFactorSetupOtpauthUrl.value = String(result.otpauthUrl || "");
      successMessage.value =
        "Escaneie a chave no seu app autenticador e confirme com um código de 6 dígitos.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to setup 2FA:", error);
      errorMessage.value = "Falha ao iniciar configuração de 2FA.";
    } finally {
      isTwoFactorBusy.value = false;
    }
  };

  const enableTwoFactor = async (): Promise<void> => {
    const code = String(twoFactorSetupCode.value || "").trim();
    if (!code) {
      errorMessage.value =
        "Informe o código do autenticador para ativar o 2FA.";
      return;
    }

    isTwoFactorBusy.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const result = await UserProfileService.enableTwoFactor(code);
      twoFactorEnabled.value = true;
      twoFactorRecoveryCodes.value = Array.isArray(result.recoveryCodes)
        ? result.recoveryCodes
        : [];
      twoFactorSetupCode.value = "";
      successMessage.value = "2FA ativado com sucesso.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to enable 2FA:", error);
      errorMessage.value = "Falha ao ativar 2FA. Verifique o código.";
    } finally {
      isTwoFactorBusy.value = false;
    }
  };

  const disableTwoFactor = async (): Promise<void> => {
    const code = String(twoFactorDisableCode.value || "").trim();
    if (!code) {
      errorMessage.value =
        "Informe um código 2FA ou recovery code para desativar.";
      return;
    }

    isTwoFactorBusy.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      await UserProfileService.disableTwoFactor(code);
      twoFactorEnabled.value = false;
      twoFactorDisableCode.value = "";
      twoFactorSetupSecret.value = "";
      twoFactorSetupOtpauthUrl.value = "";
      twoFactorRecoveryCodes.value = [];
      successMessage.value = "2FA desativado com sucesso.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to disable 2FA:", error);
      errorMessage.value = "Falha ao desativar 2FA. Verifique o código.";
    } finally {
      isTwoFactorBusy.value = false;
    }
  };

  const exportMyData = async (): Promise<void> => {
    isExportingData.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const payload = await UserProfileService.exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `crm-user-export-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      successMessage.value = "Exportação concluída.";
    } catch (error) {
      console.error("[useUserProfilePage] Failed to export data:", error);
      errorMessage.value = "Falha ao exportar dados.";
    } finally {
      isExportingData.value = false;
    }
  };

  const deleteMyAccount = async (): Promise<void> => {
    const password = String(deleteAccountPassword.value || "");
    if (!password) {
      errorMessage.value = "Informe sua senha para excluir a conta.";
      return;
    }

    const confirmed = window.confirm(
      "Esta ação é irreversível. Deseja realmente excluir sua conta?",
    );
    if (!confirmed) return;

    isDeletingAccount.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      await UserProfileService.deleteMyAccount(password);
      await authStore.logout();
      await router.replace("/auth/login");
    } catch (error) {
      console.error("[useUserProfilePage] Failed to delete account:", error);
      errorMessage.value = "Falha ao excluir conta. Verifique sua senha.";
    } finally {
      isDeletingAccount.value = false;
    }
  };

  return {
    profile,
    profileForm,
    preferences,
    passwordForm,
    isLoading,
    isSavingProfile,
    isSavingPreferences,
    isChangingPassword,
    isExportingData,
    isDeletingAccount,
    isTwoFactorBusy,
    isUploadingAvatar,
    isEditMode,
    errorMessage,
    successMessage,
    displayName,
    initials,
    hasAvatar,
    themeMode,
    twoFactorEnabled,
    twoFactorSetupSecret,
    twoFactorSetupOtpauthUrl,
    twoFactorSetupCode,
    twoFactorDisableCode,
    twoFactorRecoveryCodes,
    deleteAccountPassword,
    loadProfile,
    uploadAvatar,
    enterEditMode,
    cancelEditMode,
    saveProfile,
    savePreferences,
    changePassword,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    exportMyData,
    deleteMyAccount,
  };
}
