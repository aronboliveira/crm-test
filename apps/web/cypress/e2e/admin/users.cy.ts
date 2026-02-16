/**
 * @fileoverview E2E tests for the Admin Users page (`/admin/users`).
 * Covers: page load, table rendering, search, role filter, query-state
 *         sync, and export flow.
 * @module cypress/e2e/admin/users.cy
 */
import { ADMIN_USERS, TABLE, EXPORT_MODAL } from "../../support/selectors";

describe("Admin Users Page (/admin/users)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/admin/users");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the admin users page", () => {
    cy.get(ADMIN_USERS.PAGE).should("exist").and("be.visible");
  });

  it("should render user rows in the table", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  /* ---------------------------------------------------------------------- */
  /*  Search & filter                                                        */
  /* ---------------------------------------------------------------------- */

  it("should filter users by search query", () => {
    cy.get(ADMIN_USERS.SEARCH).clear().type("admin");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should sync search query to URL (q param)", () => {
    cy.get(ADMIN_USERS.SEARCH).clear().type("manager");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.location("search").should("include", "q=manager");
  });

  it("should hydrate search from URL query", () => {
    cy.visit("/admin/users?q=viewer");
    cy.get(ADMIN_USERS.SEARCH).should("have.value", "viewer");
  });

  it("should filter users by role selector", () => {
    cy.get(ADMIN_USERS.ROLE_FILTER).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).select("admin");
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Export                                                                  */
  /* ---------------------------------------------------------------------- */

  it("should open export modal", () => {
    cy.get(TABLE.EXPORT_BTN).first().click();
    cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
  });

  /* ---------------------------------------------------------------------- */
  /*  RBAC guard                                                             */
  /* ---------------------------------------------------------------------- */

  it("should be inaccessible to viewer role", () => {
    cy.window().then((w) => w.sessionStorage.clear());
    cy.login("viewer");
    cy.visit("/admin/users");
    cy.url().should("not.include", "/admin/users");
  });
});
