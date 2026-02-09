import { computed, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import StorageService from "../../../services/StorageService";
import type { NavItem } from "../../../types/menu.types";
import { useTasksStore } from "../../../pinia/stores/tasks.store";
import type { TaskRow } from "../../../pinia/types/tasks.types";

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function useSidebarNav() {
  const route = useRoute();
  const router = useRouter();
  const KEY = "ui.sidebar.collapsed";
  const TASKS_KEY = "ui.sidebar.tasksExpanded";

  const collapsed = ref(StorageService.local.getBool(KEY, false));
  const tasksExpanded = ref(StorageService.local.getBool(TASKS_KEY, false));

  const tasksStore = useTasksStore();

  // Load tasks on mount if not already loaded
  onMounted(async () => {
    try {
      if (!tasksStore.rows.length) {
        await tasksStore.list({ reset: true });
      }
    } catch (e) {
      console.error("[SidebarNav] failed to load tasks:", e);
    }
  });

  const taskItems = computed<readonly TaskRow[]>(() =>
    tasksStore.rows.filter((t): t is TaskRow => !!t),
  );

  const toggleTasksExpanded = () => {
    tasksExpanded.value = !tasksExpanded.value;
    StorageService.local.setBool(TASKS_KEY, tasksExpanded.value);
  };

  const goToTask = (taskId: string) => {
    router.push({ path: "/dashboard/tasks", query: { taskId } });
    if (window.innerWidth < 1024) {
      collapsed.value = true;
    }
  };

  // Auto-expand tasks section when viewing a task detail
  watch(
    () => route.query.taskId,
    (taskId) => {
      if (taskId && !tasksExpanded.value) {
        tasksExpanded.value = true;
        StorageService.local.setBool(TASKS_KEY, true);
      }
    },
    { immediate: true },
  );

  // Organized navigation sections
  const sections = computed<readonly NavSection[]>(() => [
    {
      title: "Dashboard",
      items: [
        { to: "/dashboard", label: "Overview", key: "dashboard", icon: "home" },
        {
          to: "/dashboard/my-work",
          label: "Meu Trabalho",
          key: "my_work",
          icon: "briefcase",
        },
        {
          to: "/dashboard/projects",
          label: "Projetos",
          key: "projects",
          icon: "folder",
        },
        {
          to: "/dashboard/tasks",
          label: "Tarefas",
          key: "tasks",
          icon: "check-square",
        },
        {
          to: "/dashboard/leads",
          label: "Leads",
          key: "leads",
          icon: "target",
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
      my_work: "briefcase",
      projects: "folder",
      tasks: "check-square",
      leads: "target",
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

  const isTaskActive = (taskId: string) => {
    return route.query.taskId === taskId;
  };

  const taskStatusIcon = (status: string): string => {
    switch (status) {
      case "done":
        return "✓";
      case "doing":
        return "◉";
      case "blocked":
        return "✕";
      default:
        return "○";
    }
  };

  return {
    collapsed,
    sections,
    items,
    iconFor,
    toggle,
    isActive,
    route,
    // New task submenu
    tasksExpanded,
    taskItems,
    toggleTasksExpanded,
    goToTask,
    isTaskActive,
    taskStatusIcon,
  };
}
