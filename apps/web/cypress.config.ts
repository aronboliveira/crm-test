/**
 * @fileoverview Cypress E2E configuration for the CRM web app.
 * @module cypress.config
 */
import { defineConfig } from "cypress";

const webPort = process.env.WEB_HOST_PORT ?? "5173";
const apiPort = process.env.API_HOST_PORT ?? "3000";
const baseUrl =
  process.env.CYPRESS_BASE_URL ?? `http://localhost:${webPort}`;
const apiUrl = process.env.CYPRESS_API_URL ?? `http://localhost:${apiPort}`;

export default defineConfig({
  e2e: {
    baseUrl,
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
      apiUrl,
    },
    setupNodeEvents(_on, _config) {
      // node event listeners can be added here
    },
  },
});
