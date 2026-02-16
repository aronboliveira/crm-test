/**
 * @fileoverview E2E tests for the Tasks page (`/dashboard/tasks`).
 * Covers: page load, table rendering, search, and export.
 * @module cypress/e2e/dashboard/tasks.cy
 */
import { TASKS, TABLE, EXPORT_MODAL } from "../../support/selectors";

describe("Tasks Page (/dashboard/tasks)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/tasks");
    cy.location("pathname").should("include", "/dashboard/tasks");
  });

  it("should render the tasks page", () => {
    cy.get(TASKS.PAGE).should("exist").and("be.visible");
  });

  it("should render task rows", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should filter tasks by search", () => {
    cy.get(TASKS.SEARCH).clear().type("review");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should open the export modal", () => {
    cy.get(TABLE.EXPORT_BTN).first().click();
    cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
  });

  it("should render mass and single import buttons", () => {
    cy.get('[data-cy="mass-import-tasks-button"]').should("be.visible");
    cy.get('[data-cy="single-import-task-button"]').should("be.visible");
  });
});
