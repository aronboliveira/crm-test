/**
 * @fileoverview E2E tests for the main Dashboard page (`/dashboard`).
 * Covers: page load, overview cards, stats section, and initial data rendering.
 * @module cypress/e2e/dashboard/dashboard.cy
 */
import { DASHBOARD, SHELL } from "../../support/selectors";

describe("Dashboard Page (/dashboard)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the dashboard page", () => {
    cy.get(DASHBOARD.PAGE).should("exist").and("be.visible");
  });

  it("should render within the app shell", () => {
    cy.get(SHELL.MAIN).should("exist");
  });

  /* ---------------------------------------------------------------------- */
  /*  Content                                                                */
  /* ---------------------------------------------------------------------- */

  it("should display page content without loading errors", () => {
    // No error boundaries visible
    cy.get("#error-boundary").should("not.exist");

    // The page should have at least some content rendered
    cy.get(DASHBOARD.PAGE).children().should("have.length.greaterThan", 0);
  });
});
