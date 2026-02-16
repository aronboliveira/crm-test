/**
 * @fileoverview E2E tests for the Reports page (`/dashboard/reports`).
 * Covers: page load, chart rendering, and export.
 * @module cypress/e2e/dashboard/reports.cy
 */
import { REPORTS, EXPORT_MODAL } from "../../support/selectors";

describe("Reports Page (/dashboard/reports)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/reports");
  });

  it("should render the reports page", () => {
    cy.get(REPORTS.PAGE).should("exist").and("be.visible");
  });

  it("should render at least one chart element", () => {
    cy.get(REPORTS.CHART).should("have.length.greaterThan", 0);
  });

  it("should open the export modal", () => {
    cy.contains("button", "Exportar").then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).first().click();
        cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
      }
    });
  });
});
