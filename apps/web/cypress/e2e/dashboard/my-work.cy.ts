/**
 * @fileoverview E2E tests for the My Work page (`/dashboard/my-work`).
 * Covers: page load, sections rendering.
 * @module cypress/e2e/dashboard/my-work.cy
 */
import { MY_WORK } from "../../support/selectors";

describe("My Work Page (/dashboard/my-work)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/my-work");
  });

  it("should render the My Work page", () => {
    cy.get(MY_WORK.PAGE).should("exist").and("be.visible");
  });

  it("should contain at least one section", () => {
    cy.get(MY_WORK.PAGE)
      .find(MY_WORK.SECTIONS)
      .should("have.length.greaterThan", 0);
  });
});
