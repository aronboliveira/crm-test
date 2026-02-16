/**
 * @fileoverview Cypress E2E configuration for the CRM web app.
 * @module cypress.config
 */
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    env: {
      apiUrl: "http://localhost:3000",
    },
    setupNodeEvents(_on, _config) {
      // node event listeners can be added here
    },
  },
});
