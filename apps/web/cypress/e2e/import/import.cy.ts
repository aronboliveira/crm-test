/**
 * @fileoverview E2E tests for the Import page (`/dashboard/import`).
 * Covers: page load, file input presence, and basic form interaction.
 * @module cypress/e2e/import/import.cy
 */
import { IMPORT } from "../../support/selectors";

describe("Import Page (/dashboard/import)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/import");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the import page", () => {
    cy.get(IMPORT.PAGE).should("exist").and("be.visible");
  });

  it("should display a file input or upload area", () => {
    // The legacy file upload section may be collapsed by default
    // Check if Expandir button exists and click it to reveal the file input
    cy.get(IMPORT.PAGE).then(($page) => {
      const $expandBtn = $page.find('button:contains("Expandir")');
      if ($expandBtn.length > 0) {
        cy.wrap($expandBtn).click();
      }
    });

    // Now the file input should be visible
    cy.get(IMPORT.PAGE).find('input[type="file"]').should("exist");
  });

  /* ---------------------------------------------------------------------- */
  /*  RBAC                                                                    */
  /* ---------------------------------------------------------------------- */

  it("should block viewer from accessing this page", () => {
    cy.window().then((win) => win.sessionStorage.clear());
    cy.login("viewer");
    cy.visit("/dashboard/import");
    cy.url().should("not.include", "/dashboard/import");
  });
});
