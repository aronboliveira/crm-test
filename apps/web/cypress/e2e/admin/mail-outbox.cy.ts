/**
 * @fileoverview E2E tests for the Admin Mail Outbox page (`/admin/mail-outbox`).
 * Covers: page load, table, search, kind filter, query-state sync, and export.
 * @module cypress/e2e/admin/mail-outbox.cy
 */
import {
  ADMIN_MAIL_OUTBOX,
  TABLE,
  EXPORT_MODAL,
} from "../../support/selectors";

describe("Admin Mail Outbox Page (/admin/mail-outbox)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/admin/mail-outbox");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the mail outbox page", () => {
    cy.get(ADMIN_MAIL_OUTBOX.PAGE).should("exist").and("be.visible");
  });

  it("should render mail rows", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  /* ---------------------------------------------------------------------- */
  /*  Search & filter                                                        */
  /* ---------------------------------------------------------------------- */

  it("should filter mails by search query", () => {
    cy.get(ADMIN_MAIL_OUTBOX.SEARCH).clear().type("password");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should sync search to URL (q=)", () => {
    cy.get(ADMIN_MAIL_OUTBOX.SEARCH).clear().type("reset");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.location("search").should("include", "q=reset");
  });

  it("should filter by kind when dropdown exists", () => {
    cy.get(ADMIN_MAIL_OUTBOX.KIND_FILTER).then(($sel) => {
      if ($sel.length > 0) {
        cy.wrap($sel).select(1);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.location("search").should("include", "k=");
      }
    });
  });

  it("should hydrate from URL", () => {
    cy.visit("/admin/mail-outbox?q=invite");
    cy.get(ADMIN_MAIL_OUTBOX.SEARCH).should("have.value", "invite");
  });

  /* ---------------------------------------------------------------------- */
  /*  Export                                                                  */
  /* ---------------------------------------------------------------------- */

  it("should open export modal", () => {
    cy.get(TABLE.EXPORT_BTN).first().click();
    cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
  });

  /* ---------------------------------------------------------------------- */
  /*  RBAC                                                                    */
  /* ---------------------------------------------------------------------- */

  it("should block viewer from accessing this page", () => {
    cy.window().then((win) => win.sessionStorage.clear());
    cy.login("viewer");
    cy.visit("/admin/mail-outbox");
    cy.url().should("not.include", "/admin/mail-outbox");
  });
});
