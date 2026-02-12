import {
  computed,
  ref,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
} from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../../pinia/stores/auth.store";
import AuthService from "../../../services/AuthService";
import ThemeService from "../../../services/ThemeService";
import ModalService from "../../../services/ModalService";
import UserProfilePreferencesService, {
  PROFILE_PREFERENCES_UPDATED_EVENT,
} from "../../../services/UserProfilePreferencesService";

const UserProfileModal = defineAsyncComponent(
  () => import("../../../components/shell/UserProfileModal.vue"),
);

export interface TopBarEmits {
  (e: "toggle-aside"): void;
}

export function useTopBar(emit: TopBarEmits) {
  const router = useRouter();
  const authStore = useAuthStore();
  const profilePreferences = ref(UserProfilePreferencesService.load());
  const me = computed(() => authStore.me || AuthService.me());
  const email = computed(() => String(me.value?.email ?? ""));
  const showEmailInTopBar = computed(
    () => profilePreferences.value.dashboard.showEmailInTopBar,
  );

  const refreshProfilePreferences = () => {
    profilePreferences.value = UserProfilePreferencesService.load();
  };

  // Extract display name from profile settings, then fallback to user data/email.
  const displayName = computed(() => {
    const preferredName = profilePreferences.value.preferredName.trim();
    if (preferredName) {
      return preferredName;
    }

    const user = me.value;
    if (user && "name" in user && user.name) {
      return String(user.name);
    }
    const emailVal = email.value;
    if (emailVal) {
      // Extract name part from email (before @)
      const namePart = emailVal.split("@")[0];
      // Capitalize first letter
      return (
        (namePart?.charAt(0).toUpperCase() || "") + (namePart?.slice(1) || "")
      );
    }
    return "User";
  });

  // Track dark mode state
  const isDark = ref(false);
  const themeObserver = ref<MutationObserver | null>(null);

  const updateDarkState = () => {
    isDark.value =
      document.documentElement.classList.contains("dark-mode") ||
      document.documentElement.dataset.theme === "dark";
  };

  const handleProfilePreferencesUpdated = () => {
    refreshProfilePreferences();
  };

  onMounted(() => {
    updateDarkState();
    refreshProfilePreferences();

    // Watch for theme changes
    const observer = new MutationObserver(updateDarkState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    themeObserver.value = observer;

    window.addEventListener(
      PROFILE_PREFERENCES_UPDATED_EVENT,
      handleProfilePreferencesUpdated,
    );
  });

  onUnmounted(() => {
    if (themeObserver.value) {
      themeObserver.value.disconnect();
      themeObserver.value = null;
    }

    window.removeEventListener(
      PROFILE_PREFERENCES_UPDATED_EVENT,
      handleProfilePreferencesUpdated,
    );
  });

  const logout = async () => {
    try {
      // Clear both store and service
      await authStore.logout();
      AuthService.logout();
      await router.replace("/login");
    } catch (e) {
      console.error("[TopBar] logout failed:", e);
    }
  };

  const toggleTheme = () => {
    try {
      ThemeService.toggle();
      updateDarkState();
    } catch (e) {
      console.error("[TopBar] toggleTheme failed:", e);
    }
  };

  const toggleAside = () => emit("toggle-aside");

  const openProfile = () => {
    ModalService.open(UserProfileModal, {
      title: "Meu perfil",
      size: "md",
      closable: true,
    });
  };

  return {
    me,
    email,
    showEmailInTopBar,
    displayName,
    isDark,
    logout,
    toggleTheme,
    toggleAside,
    openProfile,
  };
}
