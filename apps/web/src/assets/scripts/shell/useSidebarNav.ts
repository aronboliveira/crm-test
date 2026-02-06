import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import StorageService from "../../../services/StorageService";
import type { NavItem } from "../../../types/menu.types";

export function useSidebarNav() {
  const route = useRoute();
  const KEY = "ui.sidebar.collapsed";

  const collapsed = ref(StorageService.local.getBool(KEY, false));
  const items = computed<readonly NavItem[]>(() => [
    { to: "/tasks", label: "Tasks", key: "tasks" },
    { to: "/projects", label: "Projects", key: "projects" },
  ]);

  const iconFor = (key: string) => {
    if (key === "projects") return "grid";
    return "check";
  };

  const toggle = () => {
    try {
      collapsed.value = !collapsed.value;
      StorageService.local.setBool(KEY, collapsed.value);
    } catch (e) {
      console.error("[SidebarNav] toggle failed:", e);
    }
  };

  const isActive = (to: string) => {
    try {
      return route.path === to ? "is-active" : "";
    } catch (e) {
      console.error("[SidebarNav] isActive failed:", e);
      return "";
    }
  };

  return { collapsed, items, iconFor, toggle, isActive, route };
}
