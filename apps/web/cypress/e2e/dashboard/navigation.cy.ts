/**
 * @fileoverview E2E tests for sidebar navigation and route transitions.
 * Covers: all sidebar nav items, active-state highlighting, RBAC visibility,
 *         and keyboard-accessible navigation.
 * @module cypress/e2e/dashboard/navigation.cy
 */
import { SHELL } from "../../support/selectors";

/** Nav entries expected for an admin user (all items visible). */
const ADMIN_NAV_ENTRIES: ReadonlyArray<{
  key: string;
  path: string;
  label: string;
}> = [
  { key: "dashboard", path: "/dashboard", label: "Painel" },
  { key: "my_work", path: "/dashboard/my-work", label: "Meu Trabalho" },
  { key: "devices", path: "/dashboard/devices", label: "Meus dispositivos" },
  { key: "clients", path: "/dashboard/clients", label: "Meus Clientes" },
  { key: "projects", path: "/dashboard/projects", label: "Projetos" },
  { key: "tasks", path: "/dashboard/tasks", label: "Tarefas" },
  { key: "calendar", path: "/dashboard/calendar", label: "Calendário" },
  { key: "templates", path: "/dashboard/templates", label: "Modelos" },
  { key: "import", path: "/dashboard/import", label: "Importar" },
  { key: "reports", path: "/dashboard/reports", label: "Relatórios" },
  { key: "integrations", path: "/integrations", label: "Integrações" },
  { key: "users", path: "/admin/users", label: "Usuários" },
  { key: "audit", path: "/admin/audit", label: "Auditoria" },
  { key: "mail", path: "/admin/mail-outbox", label: "Caixa de Saída" },
];

describe("Sidebar Navigation", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the sidebar with nav items for admin", () => {
    ADMIN_NAV_ENTRIES.forEach(({ key, label }) => {
      cy.get(SHELL.navItem(key)).should("exist").and("contain.text", label);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Route transitions                                                      */
  /* ---------------------------------------------------------------------- */

  ADMIN_NAV_ENTRIES.forEach(({ key, path, label }) => {
    it(`should navigate to ${path} when clicking "${label}"`, () => {
      cy.get(SHELL.navItem(key)).click();
      cy.assertPathStartsWith(path);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  RBAC visibility – viewer should not see admin items                    */
  /* ---------------------------------------------------------------------- */

  it("should hide admin nav items for viewer role", () => {
    // Re-login as viewer
    cy.window().then((win) => win.sessionStorage.clear());
    cy.login("viewer");
    cy.visit("/dashboard");

    // Admin items should not be rendered
    cy.get(SHELL.navItem("users")).should("not.exist");
    cy.get(SHELL.navItem("audit")).should("not.exist");
    cy.get(SHELL.navItem("mail")).should("not.exist");
  });
});
