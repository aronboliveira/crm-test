import { computed } from "vue";
import { useRouter } from "vue-router";
import AuthService from "../../../services/AuthService";
import ThemeService from "../../../services/ThemeService";

export interface TopBarEmits {
  (e: "toggle-aside"): void;
}

export function useTopBar(emit: TopBarEmits) {
  const router = useRouter();
  const me = computed(() => AuthService.me());
  const email = computed(() => String(me.value?.email ?? ""));

  const logout = async () => {
    try {
      AuthService.logout();
      await router.replace("/login");
    } catch (e) {
      console.error("[TopBar] logout failed:", e);
    }
  };

  const toggleTheme = () => {
    try {
      ThemeService.toggle();
    } catch (e) {
      console.error("[TopBar] toggleTheme failed:", e);
    }
  };

  const toggleAside = () => emit("toggle-aside");

  return { me, email, logout, toggleTheme, toggleAside };
}
