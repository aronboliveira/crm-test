/**
 * @fileoverview E2E tests for the Calendar page (`/dashboard/calendar`).
 * Covers: page load, grid rendering, and month navigation.
 * @module cypress/e2e/dashboard/calendar.cy
 */
import { CALENDAR } from "../../support/selectors";

describe("Calendar Page (/dashboard/calendar)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/calendar");
  });

  it("should render the calendar page", () => {
    cy.get(CALENDAR.PAGE).should("exist").and("be.visible");
  });

  it("should render a calendar grid or equivalent view", () => {
    cy.get(CALENDAR.PAGE).children().should("have.length.greaterThan", 0);
  });

  it("should support month navigation if arrows exist", () => {
    cy.get(CALENDAR.NAV_NEXT).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        // There should still be a grid after navigation
        cy.get(CALENDAR.PAGE).should("exist");
      }
    });
  });
});
