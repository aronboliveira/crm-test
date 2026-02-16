/**
 * @fileoverview E2E tests for the Dashboard home page (`/dashboard`).
 * Covers: rendering, overview cards, and basic interactivity.
 * @module cypress/e2e/dashboard/home.cy
 */
import { DASHBOARD } from "../../support/selectors";

describe("Dashboard Home (/dashboard)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard");
  });

  it("should render the dashboard page", () => {
    cy.get(DASHBOARD.PAGE).should("exist").and("be.visible");
  });

  it("should stay on /dashboard path", () => {
    cy.assertPath("/dashboard");
  });

  it("should contain the shell sidebar", () => {
    cy.get("#main-sidebar, .sidebar, nav").should("exist");
  });

  it("should have accessible main landmark", () => {
    cy.get("main").should("exist");
  });
});
