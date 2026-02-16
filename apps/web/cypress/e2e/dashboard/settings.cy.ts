/**
 * @fileoverview E2E tests for dashboard settings page (`/dashboard/settings`).
 * Covers: customer-device criterion fieldset/selector and persistence in local storage.
 * @module cypress/e2e/dashboard/settings.cy
 */

describe("Settings Page (/dashboard/settings)", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard/settings");
  });

  it("should render criteria selector for customer devices", () => {
    cy.contains("h1", "Configurações").should("be.visible");
    cy.get('[data-testid="settings-customer-device-criteria"]').should(
      "be.visible",
    );
    cy.get('[data-testid="settings-customer-device-criteria"]').within(() => {
      cy.contains("option", "Mesmo domínio de e-mail").should("exist");
      cy.contains("option", "Qualquer e-mail diferente do meu").should("exist");
    });
  });

  it("should persist selected criterion and reflect it in devices dashboard", () => {
    cy.get('[data-testid="settings-customer-device-criteria"]').select(
      "Qualquer e-mail diferente do meu",
    );

    cy.window().then((win) => {
      const raw = win.localStorage.getItem(
        "corp.admin.devices.customer.criteria.v1",
      );
      expect(raw).to.contain("exclude-self");
    });

    cy.visit("/dashboard/devices");
    cy.contains("Critério atual:").should("exist");
    cy.contains("Qualquer e-mail diferente do meu")
      .scrollIntoView()
      .should("be.visible");
  });
});
