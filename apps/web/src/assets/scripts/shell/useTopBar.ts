import { computed, ref, onMounted, defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../../pinia/stores/auth.store";
import AuthService from "../../../services/AuthService";
import ThemeService from "../../../services/ThemeService";
import ModalService from "../../../services/ModalService";

const UserProfileModal = defineAsyncComponent(
  () => import("../../../components/shell/UserProfileModal.vue"),
);

export interface TopBarEmits {
  (e: "toggle-aside"): void;
}

export function useTopBar(emit: TopBarEmits) {
  const router = useRouter();
  const authStore = useAuthStore();
  const me = computed(() => authStore.me || AuthService.me());
  const email = computed(() => String(me.value?.email ?? ""));

  // Extract display name from email or user data
  const displayName = computed(() => {
    const user = me.value;
    if (user && "name" in user && user.name) {
      return String(user.name);
    }
    const emailVal = email.value;
    if (emailVal) {
      // Extract name part from email (before @)
      const namePart = emailVal.split("@")[0];
      // Capitalize first letter
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return "User";
  });

  // Track dark mode state
  const isDark = ref(false);

  const updateDarkState = () => {
    isDark.value =
      document.documentElement.classList.contains("dark-mode") ||
      document.documentElement.dataset.theme === "dark";
  };

  onMounted(() => {
    updateDarkState();
    // Watch for theme changes
    const observer = new MutationObserver(updateDarkState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
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
      title: "My Profile",
      size: "sm",
      closable: true,
    });
  };

  return {
    me,
    email,
    displayName,
    isDark,
    logout,
    toggleTheme,
    toggleAside,
    openProfile,
  };
}
