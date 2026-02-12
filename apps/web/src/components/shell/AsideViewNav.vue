<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLayout } from "../../assets/scripts/shell/useLayout";
import { usePolicyStore } from "../../pinia/stores/policy.store";

const layout = useLayout();
const route = useRoute();
const router = useRouter();
const policy = usePolicyStore();

interface NavItem {
  key: string;
  label: string;
  route: string;
  icon: string;
  permission?: string;
  ariaLabel?: string;
}

const allItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Painel",
    route: "/dashboard",
    icon: "house-door",
  },
  {
    key: "my_work",
    label: "Meu Trabalho",
    route: "/dashboard/my-work",
    icon: "briefcase",
  },
  {
    key: "clients",
    label: "Meus Clientes",
    route: "/dashboard/clients",
    icon: "people",
    permission: "projects.read",
  },
  {
    key: "projects",
    label: "Projetos",
    route: "/dashboard/projects",
    icon: "folder2",
    permission: "projects.read",
  },
  {
    key: "tasks",
    label: "Tarefas",
    route: "/dashboard/tasks",
    icon: "stickies",
    permission: "tasks.read",
  },
  {
    key: "calendar",
    label: "Calendário",
    route: "/dashboard/calendar",
    icon: "calendar3",
    permission: "tasks.read",
  },
  {
    key: "templates",
    label: "Modelos",
    route: "/dashboard/templates",
    icon: "files",
    permission: "projects.read",
  },
  {
    key: "import",
    label: "Importar",
    route: "/dashboard/import",
    icon: "cloud-arrow-up",
    permission: "projects.manage",
  },
  {
    key: "reports",
    label: "Relatórios",
    route: "/dashboard/reports",
    icon: "bar-chart-line",
    permission: "projects.read",
  },
  {
    key: "integrations",
    label: "Integrações",
    route: "/integrations",
    icon: "link-45deg",
    permission: "projects.manage",
  },
  {
    key: "settings",
    label: "Configurações",
    route: "/dashboard",
    icon: "gear",
    permission: undefined,
  },
  {
    key: "users",
    label: "Usuários",
    route: "/admin/users",
    icon: "people",
    permission: "users.read",
  },
  {
    key: "audit",
    label: "Auditoria",
    route: "/admin/audit",
    icon: "shield-lock",
    permission: "audit.read",
  },
  {
    key: "mail",
    label: "Caixa de Saída",
    route: "/admin/mail-outbox",
    icon: "envelope-paper",
    permission: "audit.read",
  },
];

const BOOTSTRAP_NAV_ICON_PATHS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "house-door": [
      "M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4z",
    ],
    briefcase: [
      "M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5m1.886 6.914L15 7.151V12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V7.15l6.614 1.764a1.5 1.5 0 0 0 .772 0M1.5 4h13a.5.5 0 0 1 .5.5v1.616L8.129 7.948a.5.5 0 0 1-.258 0L1 6.116V4.5a.5.5 0 0 1 .5-.5",
    ],
    people: [
      "M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
    ],
    folder2: [
      "M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5zM2.5 3a.5.5 0 0 0-.5.5V6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3zM14 7H2v5.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5z",
    ],
    stickies: [
      "M1.5 0A1.5 1.5 0 0 0 0 1.5V13a1 1 0 0 0 1 1V1.5a.5.5 0 0 1 .5-.5H14a1 1 0 0 0-1-1z",
      "M3.5 2A1.5 1.5 0 0 0 2 3.5v11A1.5 1.5 0 0 0 3.5 16h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 16 9.586V3.5A1.5 1.5 0 0 0 14.5 2zM3 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V9h-4.5A1.5 1.5 0 0 0 9 10.5V15H3.5a.5.5 0 0 1-.5-.5zm7 11.293V10.5a.5.5 0 0 1 .5-.5h4.293z",
    ],
    calendar3: [
      "M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857z",
      "M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
    ],
    files: [
      "M13 0H6a2 2 0 0 0-2 2 2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 2 2 0 0 0 2-2V2a2 2 0 0 0-2-2m0 13V4a2 2 0 0 0-2-2H5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1M3 4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
    ],
    "cloud-arrow-up": [
      "M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708z",
      "M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383m.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z",
    ],
    "bar-chart-line": [
      "M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z",
    ],
    "link-45deg": [
      "M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z",
      "M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z",
    ],
    gear: [
      "M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0",
      "M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z",
    ],
    "shield-lock": [
      "M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56",
      "M9.5 6.5a1.5 1.5 0 0 1-1 1.415l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99a1.5 1.5 0 1 1 2-1.415",
    ],
    "envelope-paper": [
      "M4 0a2 2 0 0 0-2 2v1.133l-.941.502A2 2 0 0 0 0 5.4V14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5.4a2 2 0 0 0-1.059-1.765L14 3.133V2a2 2 0 0 0-2-2zm10 4.267.47.25A1 1 0 0 1 15 5.4v.817l-1 .6zm-1 3.15-3.75 2.25L8 8.917l-1.25.75L3 7.417V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1zm-11-.6-1-.6V5.4a1 1 0 0 1 .53-.882L2 4.267zm13 .566v5.734l-4.778-2.867zm-.035 6.88A1 1 0 0 1 14 15H2a1 1 0 0 1-.965-.738L8 10.083zM1 13.116V7.383l4.778 2.867L1 13.117Z",
    ],
    fallback: [
      "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16",
    ],
  });

const getNavIconPaths = (iconKey: string): readonly string[] => {
  const iconPaths = BOOTSTRAP_NAV_ICON_PATHS[iconKey];
  if (iconPaths && iconPaths.length > 0) {
    return iconPaths;
  }
  return BOOTSTRAP_NAV_ICON_PATHS.fallback ?? [];
};

const hasAccess = (item: NavItem) => {
  if (!item.permission) return true;
  return policy.can(item.permission);
};

const mainItems = computed(() =>
  allItems.filter(
    (it) =>
      [
        "dashboard",
        "my_work",
        "clients",
        "projects",
        "tasks",
        "calendar",
        "templates",
        "import",
        "reports",
        "integrations",
      ].includes(it.key) && hasAccess(it),
  ),
);

const adminItems = computed(() =>
  allItems.filter(
    (it) => ["users", "audit", "mail"].includes(it.key) && hasAccess(it),
  ),
);

const onPick = async (item: NavItem) => {
  const target = router.resolve(item.route);
  const sameFullPath = target.fullPath === route.fullPath;

  try {
    if (!sameFullPath) {
      await router.push(target);
    }
  } catch (error) {
    console.error("[AsideViewNav] navigation failed:", error);
  } finally {
    if (window.innerWidth < 1024) {
      layout.closeMobileSidebar();
    }
  }
};

const getButtonClass = (item: NavItem) => {
  if (item.key === "dashboard") {
    return route.path === item.route || route.path === item.route + "/"
      ? "is-active"
      : "";
  }
  return route.path.startsWith(item.route) ? "is-active" : "";
};
</script>

<template>
  <div
    class="aside-backdrop"
    :class="{ 'is-open': layout.isMobileOpen.value }"
    role="presentation"
    @click.self="layout.closeMobileSidebar"
  >
    <aside
      class="aside"
      :class="{
        'is-collapsed': layout.isCollapsed.value,
        'is-open': layout.isMobileOpen.value,
      }"
      role="navigation"
      aria-label="Navegação principal"
    >
      <!-- Header -->
      <div class="aside-head">
        <div
          class="aside-brand"
          :class="{ 'sr-only': layout.isCollapsed.value }"
          title="CRM de Gerenciamento de Projetos"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="brand-icon"
            aria-hidden="true"
          >
            <polygon points="12,2 2,7 12,12 22,7 12,2" />
            <polyline points="2,17 12,22 22,17" />
            <polyline points="2,12 12,17 22,12" />
          </svg>
          <span>CRM</span>
        </div>

        <div class="aside-actions">
          <button
            class="btn btn-ghost aside-toggle"
            type="button"
            :title="
              layout.isCollapsed.value
                ? 'Expandir navegação'
                : 'Recolher navegação'
            "
            :aria-label="
              layout.isCollapsed.value
                ? 'Expandir navegação'
                : 'Recolher navegação'
            "
            :aria-pressed="layout.isCollapsed.value"
            @click="layout.toggleSidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="aside-icon"
              aria-hidden="true"
            >
              <path
                v-if="!layout.isCollapsed.value"
                d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
              />
              <path
                v-else
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>

          <button
            class="btn btn-ghost aside-close"
            type="button"
            title="Fechar navegação"
            aria-label="Fechar navegação"
            @click="layout.closeMobileSidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="aside-icon"
              aria-hidden="true"
            >
              <path
                d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Navigation -->
      <nav class="aside-nav" aria-label="Visões principais">
        <span
          v-if="!layout.isCollapsed.value"
          class="aside-section-title"
          id="main-nav-title"
        >
          Navegação
        </span>
        <div role="list" aria-labelledby="main-nav-title">
          <button
            v-for="it in mainItems"
            :key="it.key"
            class="nav-btn"
            :class="getButtonClass(it)"
            type="button"
            role="listitem"
            :title="it.label"
            :aria-label="it.ariaLabel || it.label"
            :aria-current="
              getButtonClass(it) === 'is-active' ? 'page' : undefined
            "
            @click="onPick(it)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in getNavIconPaths(it.icon)"
                :key="`${it.key}-icon-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>

            <span
              class="nav-btn__text"
              :class="{ 'sr-only': layout.isCollapsed.value }"
            >
              {{ it.label }}
            </span>
          </button>
        </div>
      </nav>

      <!-- Admin Section -->
      <nav
        v-if="adminItems.length > 0"
        class="aside-nav aside-nav--admin"
        aria-label="Visões administrativas"
      >
        <span
          v-if="!layout.isCollapsed.value"
          class="aside-section-title"
          id="admin-nav-title"
        >
          Administração
        </span>
        <div role="list" aria-labelledby="admin-nav-title">
          <button
            v-for="it in adminItems"
            :key="it.key"
            class="nav-btn"
            :class="getButtonClass(it)"
            type="button"
            role="listitem"
            :title="it.label"
            :aria-label="it.ariaLabel || it.label"
            :aria-current="
              getButtonClass(it) === 'is-active' ? 'page' : undefined
            "
            @click="onPick(it)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in getNavIconPaths(it.icon)"
                :key="`${it.key}-icon-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>

            <span
              class="nav-btn__text"
              :class="{ 'sr-only': layout.isCollapsed.value }"
            >
              {{ it.label }}
            </span>
          </button>
        </div>
      </nav>

      <!-- Footer -->
      <div class="aside-footer">
        <div
          v-if="!layout.isCollapsed.value"
          class="aside-footer__version"
          title="Versão do aplicativo"
        >
          v1.0.0
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped lang="scss">
/* Toggle / close button visibility */
.aside-toggle {
  display: flex;
  padding: 0.5rem;

  @media (max-width: 920px) {
    display: none;
  }
}

.aside-close {
  display: none;
  padding: 0.5rem;

  @media (max-width: 920px) {
    display: flex;
  }
}
</style>
