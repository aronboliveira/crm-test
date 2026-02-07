import { ref, readonly } from "vue";
import StorageService from "../../../services/StorageService";

// Persistent state – shared across all callers
const isCollapsed = ref(
  StorageService.local.getBool("ui.aside.collapsed", false),
);
const isMobileOpen = ref(false);

export function useLayout() {
  const toggleCollapsed = () => {
    isCollapsed.value = !isCollapsed.value;
    StorageService.local.setBool("ui.aside.collapsed", isCollapsed.value);
  };

  const toggleMobileOpen = () => {
    isMobileOpen.value = !isMobileOpen.value;
  };

  const openMobile = () => {
    isMobileOpen.value = true;
  };

  const closeMobile = () => {
    if (isMobileOpen.value) {
      isMobileOpen.value = false;
    }
  };

  return {
    isCollapsed: readonly(isCollapsed),
    isMobileOpen: readonly(isMobileOpen),

    // canonical names
    toggleCollapsed,
    toggleMobileOpen,
    openMobile,
    closeMobile,

    // aliases consumed by AsideViewNav / TopBar
    toggleSidebar: toggleCollapsed,
    closeMobileSidebar: closeMobile,
    openMobileSidebar: openMobile,
  };
}
