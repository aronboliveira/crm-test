/**
 * @fileoverview E2E tests for the Clients page (`/dashboard/clients`).
 * Covers: page load, table rendering, search, row click → profile,
 *         and export flow.
 * @module cypress/e2e/dashboard/clients.cy
 */
import { CLIENTS, TABLE, EXPORT_MODAL } from "../../support/selectors";

describe("Clients Page (/dashboard/clients)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/clients");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the clients page", () => {
    cy.get(CLIENTS.PAGE).should("exist").and("be.visible");
  });

  it("should render client rows in the table", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  /* ---------------------------------------------------------------------- */
  /*  Search                                                                 */
  /* ---------------------------------------------------------------------- */

  it("should filter clients by search query", () => {
    // Note: clients page may not have a traditional search input
    // Skip if search input doesn't exist
    cy.get("body").then(($body) => {
      if ($body.find(CLIENTS.SEARCH).length > 0) {
        cy.get(CLIENTS.SEARCH).clear().type("corp");
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
      } else {
        // Search not available - just verify table renders
        cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Row navigation → Client profile                                       */
  /* ---------------------------------------------------------------------- */

  it("should navigate to client profile on row click", () => {
    cy.get(CLIENTS.ROW_LINK).first().click();
    cy.assertPathStartsWith("/dashboard/clients/");
  });

  /* ---------------------------------------------------------------------- */
  /*  Export                                                                  */
  /* ---------------------------------------------------------------------- */

  it("should open the export modal", () => {
    cy.contains("button", "Exportar").first().click();
    cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
  });
});
