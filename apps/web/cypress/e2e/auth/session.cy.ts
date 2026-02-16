/**
 * @fileoverview E2E tests for authenticated session management.
 * Covers: programmatic login, session persistence, logout, and
 *         auth guard behavior across page transitions.
 * @module cypress/e2e/auth/session.cy
 */

describe("Auth Session Management", () => {
  /* ---------------------------------------------------------------------- */
  /*  Programmatic login (via API)                                           */
  /* ---------------------------------------------------------------------- */

  it("should be able to login programmatically and access /dashboard", () => {
    cy.login("admin");
    cy.visit("/dashboard");
    cy.assertPath("/dashboard");
  });

  it("should persist session across page transitions", () => {
    cy.login("admin");
    cy.visit("/dashboard");
    cy.assertPath("/dashboard");

    // Navigate to another authenticated route
    cy.visit("/dashboard/my-work");
    cy.assertPathStartsWith("/dashboard/my-work");
  });

  /* ---------------------------------------------------------------------- */
  /*  Session expiry / logout                                                */
  /* ---------------------------------------------------------------------- */

  it("should redirect to /login when session is cleared", () => {
    cy.login("admin");
    cy.visit("/dashboard");
    cy.assertPath("/dashboard");

    // Clear the session token
    cy.window().then((win) => {
      win.sessionStorage.removeItem("_auth_token_v1");
    });

    // Force a navigation that triggers the auth guard
    cy.visit("/dashboard/projects");
    cy.assertPath("/login");
  });

  /* ---------------------------------------------------------------------- */
  /*  Role-based access (smoke)                                              */
  /* ---------------------------------------------------------------------- */

  it("should allow admin to access /admin/users", () => {
    cy.login("admin");
    cy.visit("/admin/users");
    // Admin should have the permission — should NOT redirect to /dashboard
    cy.assertPathStartsWith("/admin/users");
  });

  it("should restrict viewer from /admin/users by redirecting", () => {
    cy.login("viewer");
    cy.visit("/admin/users");
    // Viewer lacks users.manage — should redirect to /dashboard
    cy.url().should("not.include", "/admin/users");
  });
});
