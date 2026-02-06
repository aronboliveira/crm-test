import { describe, it, expect, vi, beforeEach } from "vitest";

// Test that composable modules export the expected functions
describe("Composable exports", () => {
  describe("Page composables", () => {
    it("useAdminAuditPage should be a function", async () => {
      const mod = await import("../src/assets/scripts/pages/useAdminAuditPage");
      expect(typeof mod.useAdminAuditPage).toBe("function");
    });

    it("useAdminMailOutboxPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useAdminMailOutboxPage");
      expect(typeof mod.useAdminMailOutboxPage).toBe("function");
    });

    it("useAdminUsersPage should be a function", async () => {
      const mod = await import("../src/assets/scripts/pages/useAdminUsersPage");
      expect(typeof mod.useAdminUsersPage).toBe("function");
    });

    it("useAuthLoginPage should be a function", async () => {
      const mod = await import("../src/assets/scripts/pages/useAuthLoginPage");
      expect(typeof mod.useAuthLoginPage).toBe("function");
    });

    it("useAuthForgotPasswordPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useAuthForgotPasswordPage");
      expect(typeof mod.useAuthForgotPasswordPage).toBe("function");
    });

    it("useAuthResetPasswordPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useAuthResetPasswordPage");
      expect(typeof mod.useAuthResetPasswordPage).toBe("function");
    });

    it("useResetPasswordPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useResetPasswordPage");
      expect(typeof mod.useResetPasswordPage).toBe("function");
    });

    it("useDashboardProjectsPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useDashboardProjectsPage");
      expect(typeof mod.useDashboardProjectsPage).toBe("function");
    });

    it("useDashboardTasksPage should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/pages/useDashboardTasksPage");
      expect(typeof mod.useDashboardTasksPage).toBe("function");
    });
  });

  describe("Component composables", () => {
    it("useRowDetailsDrawer should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/shell/useRowDetailsDrawer");
      expect(typeof mod.useRowDetailsDrawer).toBe("function");
    });

    it("useAdminUserDetailsDrawer should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/admin/useAdminUserDetailsDrawer");
      expect(typeof mod.useAdminUserDetailsDrawer).toBe("function");
    });

    it("useUserDetailsDrawer should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/admin/useUserDetailsDrawer");
      expect(typeof mod.useUserDetailsDrawer).toBe("function");
    });

    it("useCreateUserModal should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/admin/useCreateUserModal");
      expect(typeof mod.useCreateUserModal).toBe("function");
    });

    it("useDashboardHome should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/dashboard/useDashboardHome");
      expect(typeof mod.useDashboardHome).toBe("function");
    });

    it("useAsideMenu should be a function", async () => {
      const mod = await import("../src/assets/scripts/layout/useAsideMenu");
      expect(typeof mod.useAsideMenu).toBe("function");
    });

    it("useSidebarNav should be a function", async () => {
      const mod = await import("../src/assets/scripts/shell/useSidebarNav");
      expect(typeof mod.useSidebarNav).toBe("function");
    });

    it("useAsideViewNav should be a function", async () => {
      const mod = await import("../src/assets/scripts/shell/useAsideViewNav");
      expect(typeof mod.useAsideViewNav).toBe("function");
    });

    it("useTopBar should be a function", async () => {
      const mod = await import("../src/assets/scripts/shell/useTopBar");
      expect(typeof mod.useTopBar).toBe("function");
    });

    it("useAppShell should be a function", async () => {
      const mod = await import("../src/assets/scripts/shell/useAppShell");
      expect(typeof mod.useAppShell).toBe("function");
    });

    it("useDataTableComponent should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/tables/useDataTableComponent");
      expect(typeof mod.useDataTableComponent).toBe("function");
    });

    it("useTaskFormModal should be a function", async () => {
      const mod = await import("../src/assets/scripts/tasks/useTaskFormModal");
      expect(typeof mod.useTaskFormModal).toBe("function");
    });

    it("useProjectsTable should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/projects/useProjectsTable");
      expect(typeof mod.useProjectsTable).toBe("function");
    });

    it("useTasksTable should be a function", async () => {
      const mod = await import("../src/assets/scripts/tasks/useTasksTable");
      expect(typeof mod.useTasksTable).toBe("function");
    });

    it("useTaskList should be a function", async () => {
      const mod = await import("../src/assets/scripts/tasks/useTaskList");
      expect(typeof mod.useTaskList).toBe("function");
    });

    it("useProjectList should be a function", async () => {
      const mod = await import("../src/assets/scripts/projects/useProjectList");
      expect(typeof mod.useProjectList).toBe("function");
    });

    it("useProjectSelect should be a function", async () => {
      const mod = await import("../src/assets/scripts/forms/useProjectSelect");
      expect(typeof mod.useProjectSelect).toBe("function");
    });

    it("usePasswordChecklist should be a function", async () => {
      const mod =
        await import("../src/assets/scripts/auth/usePasswordChecklist");
      expect(typeof mod.usePasswordChecklist).toBe("function");
    });
  });
});
