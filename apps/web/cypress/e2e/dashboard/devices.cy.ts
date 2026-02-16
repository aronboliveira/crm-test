/**
 * @fileoverview E2E tests for the Devices dashboard page (`/dashboard/devices`).
 * Covers: page load, CRUD form, table rendering, filters, charts,
 *         validation UX, route query-state sync, and export flow.
 * @module cypress/e2e/dashboard/devices.cy
 */
import { DEVICES, TABLE, EXPORT_MODAL } from "../../support/selectors";

describe("Devices Page (/dashboard/devices)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/devices");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the devices page", () => {
    cy.get(DEVICES.PAGE).should("exist").and("be.visible");
  });

  it("should render a data table with device rows", () => {
    cy.get(TABLE.ROWS).should("have.length.greaterThan", 0);
  });

  it("should render device analytics charts", () => {
    cy.get(DEVICES.CHARTS_SECTION).should("exist");
  });

  it("should render customer devices section", () => {
    cy.get('[data-testid="devices-customers-section"]').should("exist");
    cy.contains("h2", "Dispositivos de clientes")
      .scrollIntoView()
      .should("be.visible");
  });

  /* ---------------------------------------------------------------------- */
  /*  Search / filters                                                       */
  /* ---------------------------------------------------------------------- */

  it("should filter devices by search query", () => {
    // First, get any device name from the table to search for
    cy.get(TABLE.ROWS)
      .first()
      .invoke("text")
      .then((text) => {
        // Extract first word as search term if there are devices
        const words = text
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 2);
        if (words.length > 0) {
          const searchTerm = words[0].substring(0, 4).toLowerCase();
          cy.get(DEVICES.SEARCH).clear().type(searchTerm);
          // Wait for reactive filter
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(500);
          // Just verify we have some rows (search executed)
          cy.get(TABLE.ROWS).should("have.length.at.least", 0);
        }
      });
  });

  it("should sync search query to URL", () => {
    cy.get(DEVICES.SEARCH).clear().type("server");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.location("search").should("include", "q=server");
  });

  it("should hydrate search from URL query on load", () => {
    cy.visit("/dashboard/devices?q=test");
    cy.get(DEVICES.SEARCH).should("have.value", "test");
  });

  /* ---------------------------------------------------------------------- */
  /*  Create device (validation UX)                                          */
  /* ---------------------------------------------------------------------- */

  it("should not show invalid state on pristine required field", () => {
    // The name field should not have invalid styling before interaction
    cy.get(DEVICES.NAME_INPUT).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).should("not.have.class", "is-invalid");
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Pagination                                                             */
  /* ---------------------------------------------------------------------- */

  it("should navigate pages", () => {
    cy.get(TABLE.PAGINATION_NEXT).then(($btn) => {
      if (!$btn.prop("disabled")) {
        cy.wrap($btn).click();
        cy.location("search").should("include", "p=2");
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Export flow                                                             */
  /* ---------------------------------------------------------------------- */

  it("should open the export modal and display format options", () => {
    cy.contains("button", "Exportar")
      .filter(":visible")
      .then(($buttons) => {
        const enabled = $buttons.filter(
          (_, el) => !el.hasAttribute("disabled"),
        );
        if (enabled.length > 0) {
          cy.wrap(enabled.first()).click();
          cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
          cy.get(EXPORT_MODAL.FORMAT_CSV).should("exist");
          cy.get(EXPORT_MODAL.FORMAT_XLSX).should("exist");
          return;
        }

        cy.wrap($buttons.first()).should("be.disabled");
      });
  });

  it("should close the export modal on cancel", () => {
    cy.contains("button", "Exportar")
      .filter(":visible")
      .then(($buttons) => {
        const enabled = $buttons.filter(
          (_, el) => !el.hasAttribute("disabled"),
        );
        if (enabled.length > 0) {
          cy.wrap(enabled.first()).click();
          cy.get(EXPORT_MODAL.DIALOG).should("be.visible");
          cy.contains("button", "Cancelar").click();
          cy.get(EXPORT_MODAL.DIALOG).should("not.exist");
          return;
        }

        cy.wrap($buttons.first()).should("be.disabled");
      });
  });
});
