/**
 * @fileoverview E2E tests for sidebar navigation.
 * Validates that each menu item navigates to the expected route
 * and that permission-gated items are hidden for restricted roles.
 * @module cypress/e2e/navigation/sidebar.cy
 */
import { SHELL } from "../../support/selectors";

/** Expected nav items visible to an admin user */
const ADMIN_NAV_ITEMS: ReadonlyArray<{ key: string; route: string }> = [
  { key: "dashboard", route: "/dashboard" },
  { key: "my_work", route: "/dashboard/my-work" },
  { key: "devices", route: "/dashboard/devices" },
  { key: "clients", route: "/dashboard/clients" },
  { key: "projects", route: "/dashboard/projects" },
  { key: "tasks", route: "/dashboard/tasks" },
  { key: "calendar", route: "/dashboard/calendar" },
  { key: "templates", route: "/dashboard/templates" },
  { key: "import", route: "/dashboard/import" },
  { key: "reports", route: "/dashboard/reports" },
  { key: "integrations", route: "/integrations" },
  { key: "users", route: "/admin/users" },
  { key: "audit", route: "/admin/audit" },
  { key: "mail", route: "/admin/mail-outbox" },
];

/** Nav items that require elevated permissions (not visible to viewer) */
const RESTRICTED_NAV_KEYS = [
  "devices",
  "clients",
  "projects",
  "tasks",
  "calendar",
  "templates",
  "import",
  "reports",
  "integrations",
  "users",
  "audit",
  "mail",
];

describe("Sidebar Navigation", () => {
  describe("as admin", () => {
    beforeEach(() => {
      cy.login("admin");
      cy.visit("/dashboard");
    });

    it("should render all nav items for admin", () => {
      ADMIN_NAV_ITEMS.forEach(({ key }) => {
        cy.get(SHELL.navItem(key)).should("exist");
      });
    });

    ADMIN_NAV_ITEMS.forEach(({ key, route }) => {
      it(`should navigate to ${route} when clicking "${key}"`, () => {
        cy.get(SHELL.navItem(key)).click();
        cy.assertPathStartsWith(route);
      });
    });
  });

  describe("as viewer (restricted role)", () => {
    beforeEach(() => {
      cy.login("viewer");
      cy.visit("/dashboard");
    });

    it("should show at least the dashboard nav item", () => {
      cy.get(SHELL.navItem("dashboard")).should("exist");
    });

    it("should hide permission-restricted nav items from viewer", () => {
      // viewer should not see admin items
      ["users", "audit", "mail"].forEach((key) => {
        cy.get(SHELL.navItem(key)).should("not.exist");
      });
    });
  });
});
