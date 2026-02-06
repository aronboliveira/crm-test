import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { defineAsyncComponent } from "vue";
import RetriableImport from "../bootstrap/RetriableImport";
import AuthService from "../services/AuthService";
import AuthGuardService from "../services/AuthGuardService";
import type { RouteMetaGuard } from "../types/router-meta.types";
import BootstrapCoordinator from "../bootstrap/BootstrapCoordinator";
import PolicyService from "../services/PolicyService";
import { useAuthStore } from "../pinia/stores/auth.store";
import { usePolicyStore } from "../pinia/stores/policy.store";

const policy = { tries: 8, intervalMs: 140 } as const;

const Shell = defineAsyncComponent(() =>
  RetriableImport.load(
    () => import("../components/shell/AppShell.vue"),
    policy,
  ),
);

const Login = defineAsyncComponent(() =>
  RetriableImport.load(() => import("../pages/AuthLoginPage.vue"), policy),
);

const Forgot = defineAsyncComponent(() =>
  RetriableImport.load(
    () => import("../pages/AuthForgotPasswordPage.vue"),
    policy,
  ),
);

const Reset = defineAsyncComponent(() =>
  RetriableImport.load(
    () => import("../pages/AuthResetPasswordPage.vue"),
    policy,
  ),
);

const AdminUsers = defineAsyncComponent(() =>
  RetriableImport.load(() => import("../pages/AdminUsersPage.vue"), policy),
);

const AdminAudit = defineAsyncComponent(() =>
  RetriableImport.load(() => import("../pages/AdminAuditPage.vue"), policy),
);

const routes: RouteRecordRaw[] = [
  { path: "/login", component: Login, meta: { public: true } },
  { path: "/forgot-password", component: Forgot, meta: { public: true } },
  { path: "/reset-password", component: Reset, meta: { public: true } },
  {
    path: "/admin/users",
    component: AdminUsers,
    meta: { auth: true, perm: "users.manage" },
  },
  {
    path: "/admin/audit",
    component: AdminAudit,
    meta: { auth: true, perm: "audit.read" },
  },
  { path: "/", component: Shell, meta: { auth: true } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
  {
    path: "/admin/mail-outbox",
    name: "AdminMailOutbox",
    component: () => import("../pages/AdminMailOutboxPage.vue"),
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: () => import("../pages/ResetPasswordPage.vue"),
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("../pages/DashboardPage.vue"),
    meta: { requiresAuth: true } satisfies RouteMetaGuard,
  },
  {
    path: "/dashboard/projects",
    name: "DashboardProjects",
    component: () => import("../pages/DashboardProjectsPage.vue"),
    meta: {
      requiresAuth: true,
      perm: "projects.read",
    } satisfies RouteMetaGuard,
  },
  {
    path: "/dashboard/tasks",
    name: "DashboardTasks",
    component: () => import("../pages/DashboardTasksPage.vue"),
    meta: { requiresAuth: true, perm: "tasks.read" } satisfies RouteMetaGuard,
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const policy = usePolicyStore();

  auth.isReady ? void 0 : await auth.bootstrap();
  auth.isLoggedIn && !policy.isReady ? await policy.bootstrap() : void 0;

  const meta = (to.meta || {}) as RouteMetaGuard;
  const requiresAuth = !!meta.requiresAuth;
  const perm = typeof meta.perm === "string" ? meta.perm.trim() : "";

  requiresAuth && !auth.isLoggedIn
    ? { path: "/login", query: { next: to.fullPath } }
    : void 0;
  if (requiresAuth && !auth.isLoggedIn)
    return { path: "/login", query: { next: to.fullPath } };

  perm && !policy.can(perm) ? { path: "/dashboard" } : void 0;
  return perm && !policy.can(perm) ? { path: "/dashboard" } : true;
});

export default router;
