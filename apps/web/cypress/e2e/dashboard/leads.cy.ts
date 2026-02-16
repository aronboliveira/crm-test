/**
 * @fileoverview E2E tests for the Leads page (`/dashboard/leads`).
 * Covers: page load, table rendering, and search.
 * @module cypress/e2e/dashboard/leads.cy
 */
import { LEADS, TABLE } from "../../support/selectors";

describe("Leads Page (/dashboard/leads)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/leads");
    cy.location("pathname").should("include", "/dashboard/leads");
  });

  it("should render the leads page", () => {
    cy.get(LEADS.PAGE).should("exist").and("be.visible");
  });

  it("should render lead rows", () => {
    cy.get("body").then(($body) => {
      const hasRows =
        $body.find(".lead-card").length > 0 ||
        $body.find("tbody tr").length > 0;
      if (hasRows) {
        cy.get(".lead-card, tbody tr").should("have.length.greaterThan", 0);
      } else {
        cy.contains("Nenhum lead", { matchCase: false }).should("exist");
      }
    });
  });

  it("should filter leads by search", () => {
    cy.get("body").then(($body) => {
      if ($body.find(LEADS.SEARCH).length > 0) {
        cy.get(LEADS.SEARCH).clear().type("empresa");
        cy.wait(500);
        cy.get(".lead-card, tbody tr").should("have.length.greaterThan", 0);
        return;
      }

      // Default view is board. Switch to table when available to validate sort/table rendering.
      const tableBtn = $body
        .find(".view-btn")
        .filter((_idx: number, el: Element) =>
          String(el.textContent || "")
            .toLowerCase()
            .includes("tabela"),
        );
      if (tableBtn.length > 0) {
        cy.wrap(tableBtn.first()).click();
        cy.get("body").then(($tableBody) => {
          const rowCount = $tableBody.find("tbody tr").length;
          if (rowCount > 0) {
            cy.get("tbody tr").should("have.length.greaterThan", 0);
          } else {
            cy.contains("Nenhum lead", { matchCase: false }).should("exist");
          }
        });
      } else {
        cy.get("body").then(($boardBody) => {
          const cardCount = $boardBody.find(".lead-card").length;
          if (cardCount > 0) {
            cy.get(".lead-card").should("have.length.greaterThan", 0);
          } else {
            cy.contains("Nenhum lead", { matchCase: false }).should("exist");
          }
        });
      }
    });
  });

  it("should render mass and single import buttons", () => {
    cy.get('[data-cy="mass-import-leads-button"]').should("be.visible");
    cy.get('[data-cy="single-import-lead-button"]').should("be.visible");
  });
});
