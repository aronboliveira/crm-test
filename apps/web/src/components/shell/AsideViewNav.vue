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
  { key: "dashboard", label: "Dashboard", route: "/dashboard", icon: "home" },
  {
    key: "projects",
    label: "Projects",
    route: "/dashboard/projects",
    icon: "folder",
    permission: "projects.read",
  },
  {
    key: "tasks",
    label: "Tasks",
    route: "/dashboard/tasks",
    icon: "check-square",
    permission: "tasks.read",
  },
  {
    key: "calendar",
    label: "Calendar",
    route: "/dashboard/calendar",
    icon: "calendar",
    permission: "tasks.read",
  },
  {
    key: "templates",
    label: "Templates",
    route: "/dashboard/templates",
    icon: "copy",
    permission: "projects.read",
  },
  {
    key: "import",
    label: "Import",
    route: "/dashboard/import",
    icon: "upload",
    permission: "projects.manage",
  },
  {
    key: "reports",
    label: "Reports",
    route: "/dashboard/reports",
    icon: "bar-chart",
    permission: "projects.read",
  },
  {
    key: "settings",
    label: "Settings",
    route: "/dashboard",
    icon: "settings",
    permission: undefined,
  },
  {
    key: "users",
    label: "Users",
    route: "/admin/users",
    icon: "users",
    permission: "users.read",
  },
  {
    key: "audit",
    label: "Audit Log",
    route: "/admin/audit",
    icon: "shield",
    permission: "audit.read",
  },
  {
    key: "mail",
    label: "Mail Outbox",
    route: "/admin/mail-outbox",
    icon: "mail",
    permission: "audit.read",
  },
];

const hasAccess = (item: NavItem) => {
  if (!item.permission) return true;
  return policy.can(item.permission);
};

const mainItems = computed(() =>
  allItems.filter(
    (it) =>
      [
        "dashboard",
        "projects",
        "tasks",
        "calendar",
        "templates",
        "import",
        "reports",
      ].includes(it.key) && hasAccess(it),
  ),
);

const adminItems = computed(() =>
  allItems.filter(
    (it) => ["users", "audit", "mail"].includes(it.key) && hasAccess(it),
  ),
);

const onPick = (item: NavItem) => {
  router.push(item.route);
  if (window.innerWidth < 1024) {
    layout.closeMobileSidebar();
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
      aria-label="Main navigation"
    >
      <!-- Header -->
      <div class="aside-head">
        <div
          class="aside-brand"
          :class="{ 'sr-only': layout.isCollapsed.value }"
          title="Project Manager CRM"
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
                ? 'Expand navigation'
                : 'Collapse navigation'
            "
            :aria-label="
              layout.isCollapsed.value
                ? 'Expand navigation'
                : 'Collapse navigation'
            "
            :aria-pressed="layout.isCollapsed.value"
            @click="layout.toggleSidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="aside-icon"
              aria-hidden="true"
            >
              <polyline
                v-if="!layout.isCollapsed.value"
                points="11,17 6,12 11,7"
              />
              <polyline v-else points="13,7 18,12 13,17" />
              <line x1="18" y1="12" x2="6" y2="12" />
            </svg>
          </button>

          <button
            class="btn btn-ghost aside-close"
            type="button"
            title="Close navigation"
            aria-label="Close navigation"
            @click="layout.closeMobileSidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="aside-icon"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Navigation -->
      <nav class="aside-nav" aria-label="Main views">
        <span
          v-if="!layout.isCollapsed.value"
          class="aside-section-title"
          id="main-nav-title"
        >
          Navigation
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
            <!-- Home -->
            <svg
              v-if="it.icon === 'home'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            <!-- Folder -->
            <svg
              v-else-if="it.icon === 'folder'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path
                d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
              />
            </svg>
            <!-- Check-Square -->
            <svg
              v-else-if="it.icon === 'check-square'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <polyline points="9,11 12,14 22,4" />
              <path
                d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              />
            </svg>
            <!-- Bar Chart (Reports) -->
            <svg
              v-else-if="it.icon === 'bar-chart'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            <!-- Settings -->
            <svg
              v-else-if="it.icon === 'settings'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 1v6m0 6v6m5.66-14.66l-4.24 4.24m0 5.65l-4.24 4.24M23 12h-6m-6 0H1m14.66 5.66l-4.24-4.24m0-5.65l-4.24-4.24"
              />
            </svg>
            <!-- Fallback -->
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
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
        aria-label="Admin views"
      >
        <span
          v-if="!layout.isCollapsed.value"
          class="aside-section-title"
          id="admin-nav-title"
        >
          Admin
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
            <!-- Users -->
            <svg
              v-if="it.icon === 'users'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <!-- Shield (Audit) -->
            <svg
              v-else-if="it.icon === 'shield'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <!-- Mail -->
            <svg
              v-else-if="it.icon === 'mail'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <!-- Fallback -->
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nav-btn__icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
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
          title="Application version"
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
