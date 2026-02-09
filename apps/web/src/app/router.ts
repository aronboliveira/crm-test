import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import type { RouteMetaGuard } from "../types/router-meta.types";
import { useAuthStore } from "../pinia/stores/auth.store";
import { usePolicyStore } from "../pinia/stores/policy.store";
import AppShell from "../components/shell/AppShell.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: () => import("../pages/AuthLoginPage.vue"),
    meta: { public: true },
  },
  {
    path: "/forgot-password",
    component: () => import("../pages/AuthForgotPasswordPage.vue"),
    meta: { public: true },
  },
  {
    path: "/reset-password",
    component: () => import("../pages/AuthResetPasswordPage.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: "", redirect: "/dashboard" },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../pages/DashboardPage.vue"),
      },
      {
        path: "dashboard/my-work",
        name: "DashboardMyWork",
        component: () => import("../pages/DashboardMyWorkPage.vue"),
      },
      {
        path: "dashboard/clients",
        name: "DashboardClients",
        component: () => import("../pages/DashboardClientsPage.vue"),
        meta: { perm: "projects.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/leads",
        name: "DashboardLeads",
        component: () => import("../pages/DashboardLeadsPage.vue"),
        meta: { perm: "leads.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/projects",
        name: "DashboardProjects",
        component: () => import("../pages/DashboardProjectsPage.vue"),
        meta: { perm: "projects.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/tasks",
        name: "DashboardTasks",
        component: () => import("../pages/DashboardTasksPage.vue"),
        meta: { perm: "tasks.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/calendar",
        name: "Calendar",
        component: () => import("../pages/CalendarPage.vue"),
        meta: { perm: "tasks.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/templates",
        name: "Templates",
        component: () => import("../pages/TemplatesPage.vue"),
        meta: { perm: "projects.read" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/import",
        name: "Import",
        component: () => import("../pages/ImportPage.vue"),
        meta: { perm: "projects.manage" } satisfies RouteMetaGuard,
      },
      {
        path: "dashboard/reports",
        name: "DashboardReports",
        component: () => import("../pages/DashboardReportsPage.vue"),
        meta: { perm: "projects.read" } satisfies RouteMetaGuard,
      },
      {
        path: "admin/users",
        component: () => import("../pages/AdminUsersPage.vue"),
        meta: { perm: "users.manage" } satisfies RouteMetaGuard,
      },
      {
        path: "admin/audit",
        component: () => import("../pages/AdminAuditPage.vue"),
        meta: { perm: "audit.read" } satisfies RouteMetaGuard,
      },
      {
        path: "admin/mail-outbox",
        name: "AdminMailOutbox",
        component: () => import("../pages/AdminMailOutboxPage.vue"),
        meta: { perm: "audit.read" } satisfies RouteMetaGuard,
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const policy = usePolicyStore();

  auth.isReady ? void 0 : await auth.bootstrap();

  // Re-bootstrap policy whenever the user is logged in but perms are empty.
  // This covers the scenario where the user just logged in and the
  // policy store was previously reset() with an empty permission set.
  if (auth.isLoggedIn) {
    const needsBoot =
      !policy.isReady ||
      !Array.isArray(policy.perms) ||
      policy.perms.length === 0;

    if (needsBoot) {
      try {
        policy.$patch({ ready: false, perms: [] });
        await policy.bootstrap();
      } catch (err) {
        console.error("[Router] policy.bootstrap() failed:", err);
      }
    }
  }

  // Vue Router 4 does NOT merge parent meta into child meta automatically.
  // We must walk `to.matched` to check if any ancestor requires auth.
  const requiresAuth = to.matched.some(
    (record) => !!(record.meta as RouteMetaGuard).requiresAuth,
  );

  const perm =
    typeof (to.meta as RouteMetaGuard).perm === "string"
      ? ((to.meta as RouteMetaGuard).perm as string).trim()
      : "";

  if (requiresAuth && !auth.isLoggedIn) {
    return { path: "/login", query: { next: to.fullPath } };
  }

  if (perm) {
    // Use the action directly — avoids stale getter closures
    const allowed = policy.can(perm);
    if (!allowed) {
      console.warn(
        `[Router] Access denied: perm="${perm}", ` +
          `perms=[${(policy.perms ?? []).join(", ")}], ` +
          `ready=${policy.isReady}, path=${to.path}`,
      );
      if (to.path !== "/dashboard") {
        return { path: "/dashboard" };
      }
    }
  }

  return true;
});

export default router;
