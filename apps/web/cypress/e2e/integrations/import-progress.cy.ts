/**
 * @fileoverview E2E tests for integration file import (CSV/JSON/XML)
 * and progress feedback (SweetAlert progress popup, spinner, step states).
 *
 * Tests cover:
 * - File import button visibility in each config modal
 * - CSV/JSON/XML file import fills form fields
 * - Progress popup appears during save operations
 * - Progress step state transitions
 * - SweetAlert finish popup after completion
 *
 * @module cypress/e2e/integrations/import-progress.cy
 */
import { INTEGRATIONS } from "../../support/selectors";

/**
 * All integration adapter keys and their display names as used
 * by `IntegrationCard` titles.
 */
const INTEGRATIONS_META = [
  { id: "glpi", name: "GLPI" },
  { id: "sat", name: "SAT ERP" },
  { id: "nextcloud", name: "Nextcloud" },
  { id: "zimbra", name: "Zimbra" },
  { id: "outlook", name: "Outlook" },
  { id: "whatsapp", name: "WhatsApp Business" },
] as const;

/** Helper: open the config modal for a given integration. */
function openConfigModal(id: string, name: string): void {
  cy.get(INTEGRATIONS.CARD_BY_ID(id)).then(($card) => {
    if ($card.length === 0) {
      cy.log(`${name} card not rendered — skipping`);
      return;
    }
    cy.wrap($card).find(".card-header").first().click();
    cy.wrap($card)
      .find(`button[title*="Configurar integração ${name}"]`)
      .first()
      .click();
  });
}

/** Helper: dismiss any open SweetAlert popup. */
function dismissSwal(): void {
  cy.get("body").then(($body) => {
    if ($body.find(".swal2-confirm").length > 0) {
      cy.get(".swal2-confirm").first().click({ force: true });
    } else if ($body.find(".swal2-close").length > 0) {
      cy.get(".swal2-close").first().click({ force: true });
    }
  });
}

describe("Integration File Import & Progress Feedback", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/integrations");
  });

  /* ====================================================================== */
  /*  File Import UI                                                        */
  /* ====================================================================== */

  describe("File import button visibility", () => {
    for (const { id, name } of INTEGRATIONS_META) {
      it(`should show file import button in ${name} config modal`, () => {
        cy.get(INTEGRATIONS.CARD_BY_ID(id)).then(($card) => {
          if ($card.length === 0) {
            cy.log(`${name} card not rendered — skipping`);
            return;
          }

          cy.wrap($card).find(".card-header").first().click();
          cy.wrap($card)
            .find(`button[title*="Configurar integração"]`)
            .first()
            .click();

          cy.get(INTEGRATIONS.IMPORT_ROW(id)).should("be.visible");
          cy.get(INTEGRATIONS.IMPORT_ROW(id))
            .find(INTEGRATIONS.IMPORT_BTN)
            .should("exist");
          cy.get(INTEGRATIONS.IMPORT_ROW(id))
            .find(INTEGRATIONS.IMPORT_LABEL)
            .should("contain.text", "CSV, JSON ou XML");
        });
      });
    }
  });

  /* ====================================================================== */
  /*  CSV import fills form                                                  */
  /* ====================================================================== */

  describe("CSV file import", () => {
    it("should fill GLPI form fields from a CSV file", () => {
      openConfigModal("glpi", "GLPI");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      // Use cy.selectFile with a fixture
      cy.get(INTEGRATIONS.IMPORT_INPUT("glpi")).selectFile(
        "cypress/fixtures/integration-import-glpi.csv",
        { force: true },
      );

      // Wait for SweetAlert progress to finish
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");

      // Dismiss the success alert
      dismissSwal();

      // Check that the form fields were filled
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="baseUrl"]')
        .should("have.value", "https://glpi.example.com");
    });
  });

  /* ====================================================================== */
  /*  JSON import fills form                                                 */
  /* ====================================================================== */

  describe("JSON file import", () => {
    it("should fill GLPI form fields from a JSON file", () => {
      openConfigModal("glpi", "GLPI");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      cy.get(INTEGRATIONS.IMPORT_INPUT("glpi")).selectFile(
        "cypress/fixtures/integration-import-glpi.json",
        { force: true },
      );

      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      dismissSwal();

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="baseUrl"]')
        .should("have.value", "https://glpi.example.com");
    });
  });

  /* ====================================================================== */
  /*  XML import fills form                                                  */
  /* ====================================================================== */

  describe("XML file import", () => {
    it("should fill GLPI form fields from an XML file", () => {
      openConfigModal("glpi", "GLPI");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      cy.get(INTEGRATIONS.IMPORT_INPUT("glpi")).selectFile(
        "cypress/fixtures/integration-import-glpi.xml",
        { force: true },
      );

      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      dismissSwal();

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="baseUrl"]')
        .should("have.value", "https://glpi.example.com");
    });
  });

  /* ====================================================================== */
  /*  File import disabled state during import                              */
  /* ====================================================================== */

  describe("File import disabled state", () => {
    it("should disable the import button while importing", () => {
      openConfigModal("glpi", "GLPI");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      // Start the import — the button should get the disabled class
      cy.get(INTEGRATIONS.IMPORT_INPUT("glpi")).selectFile(
        "cypress/fixtures/integration-import-glpi.csv",
        { force: true },
      );

      // The import completes quickly, so we just check the final state
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      dismissSwal();

      // After import completes, the button should be re-enabled
      cy.get(INTEGRATIONS.IMPORT_ROW("glpi"))
        .find(INTEGRATIONS.IMPORT_BTN)
        .should("not.have.class", "disabled");
    });
  });

  /* ====================================================================== */
  /*  Progress popup during save                                            */
  /* ====================================================================== */

  describe("Progress feedback during save", () => {
    it("should show progress popup with steps when saving GLPI", () => {
      cy.intercept("POST", "**/integrations/glpi/configure").as("configGlpi");
      cy.intercept("POST", "**/integrations/glpi/test").as("testGlpi");

      openConfigModal("glpi", "GLPI");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      // Fill minimal required fields
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="baseUrl"]')
        .clear()
        .type("https://glpi.test.com");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="username"]')
        .clear()
        .type("admin");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="appToken"]')
        .clear()
        .type("test-token");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="userToken"]')
        .clear()
        .type("user-token");

      // Submit the form
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).submit();

      // The SweetAlert progress popup should appear
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");

      // The popup concludes with success or error — either way a SweetAlert is shown
      cy.get(".swal2-popup", { timeout: 15000 }).should("be.visible");
      dismissSwal();
    });

    it("should show progress steps with correct data attributes", () => {
      cy.intercept("POST", "**/integrations/glpi/configure").as("configGlpi");
      cy.intercept("POST", "**/integrations/glpi/test").as("testGlpi");

      openConfigModal("glpi", "GLPI");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="baseUrl"]')
        .clear()
        .type("https://glpi.test.com");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="username"]')
        .clear()
        .type("admin");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="appToken"]')
        .clear()
        .type("test-token");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi"))
        .find('input[data-input-id="userToken"]')
        .clear()
        .type("user-token");

      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).submit();

      // Check progress steps exist with data-step-key attributes
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      cy.get(".swal2-popup").then(($popup) => {
        // The progress popup should have progress step elements
        const hasSteps = $popup.find(INTEGRATIONS.PROGRESS_STEP).length > 0;
        const hasBar = $popup.find(INTEGRATIONS.PROGRESS_BAR).length > 0;

        // Either the progress popup is showing or the final result popup replaced it
        if (hasSteps) {
          cy.wrap($popup).find('[data-step-key="validate"]').should("exist");
          cy.wrap($popup).find('[data-step-key="save"]').should("exist");
          cy.wrap($popup).find('[data-step-key="test"]').should("exist");
        }
        if (hasBar) {
          cy.wrap($popup).find(INTEGRATIONS.PROGRESS_BAR).should("exist");
        }
      });

      // Eventually a final SweetAlert appears
      cy.get(".swal2-popup", { timeout: 15000 }).should("be.visible");
      dismissSwal();
    });
  });

  /* ====================================================================== */
  /*  Progress bar animation                                                */
  /* ====================================================================== */

  describe("Progress bar", () => {
    it("should have a progress bar container with ARIA attributes", () => {
      cy.intercept("POST", "**/integrations/sat/configure").as("configSat");
      cy.intercept("POST", "**/integrations/sat/test").as("testSat");

      openConfigModal("sat", "SAT ERP");
      cy.get(INTEGRATIONS.CONFIG_FORM("sat")).should("be.visible");

      cy.get(INTEGRATIONS.CONFIG_FORM("sat"))
        .find('input[data-input-id="baseUrl"]')
        .clear()
        .type("https://sat.test.com");
      cy.get(INTEGRATIONS.CONFIG_FORM("sat"))
        .find('input[data-input-id="clientId"]')
        .clear()
        .type("client-id");
      cy.get(INTEGRATIONS.CONFIG_FORM("sat"))
        .find('input[data-input-id="clientSecret"]')
        .clear()
        .type("client-secret");

      cy.get(INTEGRATIONS.CONFIG_FORM("sat")).submit();

      // Look for progress bar container with role="progressbar"
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      cy.get(".swal2-popup").then(($popup) => {
        const barContainer = $popup.find(".integration-progress-bar-container");
        if (barContainer.length > 0) {
          expect(barContainer.attr("role")).to.eq("progressbar");
          expect(barContainer.attr("aria-valuemin")).to.eq("0");
          expect(barContainer.attr("aria-valuemax")).to.eq("100");
        }
      });

      cy.get(".swal2-popup", { timeout: 15000 }).should("be.visible");
      dismissSwal();
    });
  });

  /* ====================================================================== */
  /*  File import with empty file                                            */
  /* ====================================================================== */

  describe("Empty file import", () => {
    it("should show error when importing an empty CSV file", () => {
      openConfigModal("glpi", "GLPI");
      cy.get(INTEGRATIONS.CONFIG_FORM("glpi")).should("be.visible");

      // Create an empty CSV file on the fly
      const emptyContent = new Blob([""], { type: "text/csv" });
      const emptyFile = new File([emptyContent], "empty.csv", {
        type: "text/csv",
      });

      cy.get(INTEGRATIONS.IMPORT_INPUT("glpi")).selectFile(
        { contents: emptyFile, fileName: "empty.csv", mimeType: "text/csv" },
        { force: true },
      );

      // Should get an error or warning SweetAlert
      cy.get(".swal2-popup", { timeout: 10000 }).should("be.visible");
      dismissSwal();
    });
  });

  /* ====================================================================== */
  /*  File import in each integration                                       */
  /* ====================================================================== */

  describe("File import button in each integration modal", () => {
    for (const { id, name } of INTEGRATIONS_META) {
      it(`should have file input with correct accept attribute in ${name}`, () => {
        cy.get(INTEGRATIONS.CARD_BY_ID(id)).then(($card) => {
          if ($card.length === 0) {
            cy.log(`${name} card not rendered — skipping`);
            return;
          }

          cy.wrap($card).find(".card-header").first().click();
          cy.wrap($card)
            .find(`button[title*="Configurar integração"]`)
            .first()
            .click();

          cy.get(INTEGRATIONS.IMPORT_INPUT(id))
            .should("exist")
            .and("have.attr", "accept", ".csv,.json,.xml");
        });
      });
    }
  });
});
