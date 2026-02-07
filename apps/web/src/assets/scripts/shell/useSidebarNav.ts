import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import StorageService from "../../../services/StorageService";
import type { NavItem } from "../../../types/menu.types";

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function useSidebarNav() {
  const route = useRoute();
  const KEY = "ui.sidebar.collapsed";

  const collapsed = ref(StorageService.local.getBool(KEY, false));

  // Organized navigation sections
  const sections = computed<readonly NavSection[]>(() => [
    {
      title: "Dashboard",
      items: [
        { to: "/dashboard", label: "Overview", key: "dashboard", icon: "home" },
        {
          to: "/dashboard/projects",
          label: "Projects",
          key: "projects",
          icon: "folder",
        },
        {
          to: "/dashboard/tasks",
          label: "Tasks",
          key: "tasks",
          icon: "check-square",
        },
      ],
    },
    {
      title: "Administration",
      items: [
        { to: "/admin/users", label: "Users", key: "users", icon: "users" },
        {
          to: "/admin/audit",
          label: "Audit Log",
          key: "audit",
          icon: "activity",
        },
        { to: "/admin/mail", label: "Mail Outbox", key: "mail", icon: "mail" },
      ],
    },
  ]);

  // Flat list of all items for backwards compatibility
  const items = computed<readonly NavItem[]>(() =>
    sections.value.flatMap((s) => s.items),
  );

  const iconFor = (key: string): string => {
    const iconMap: Record<string, string> = {
      dashboard: "home",
      projects: "folder",
      tasks: "check-square",
      users: "users",
      audit: "activity",
      mail: "mail",
    };
    return iconMap[key] || "circle";
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
      // Exact match or starts with (for nested routes)
      if (route.path === to) return "is-active";
      if (to !== "/dashboard" && route.path.startsWith(to)) return "is-active";
      return "";
    } catch (e) {
      console.error("[SidebarNav] isActive failed:", e);
      return "";
    }
  };

  return { collapsed, sections, items, iconFor, toggle, isActive, route };
}
