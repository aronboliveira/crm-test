/**
 * @fileoverview E2E tests for the Templates page (`/dashboard/templates`).
 * Covers: page load and template list rendering.
 * @module cypress/e2e/dashboard/templates.cy
 */
import { TEMPLATES } from "../../support/selectors";

describe("Templates Page (/dashboard/templates)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/templates");
  });

  it("should render the templates page", () => {
    cy.get(TEMPLATES.PAGE).should("exist").and("be.visible");
  });

  it("should render template items or an empty state", () => {
    cy.get(TEMPLATES.PAGE).children().should("have.length.greaterThan", 0);
  });
});
