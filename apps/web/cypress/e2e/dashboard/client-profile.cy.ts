/**
 * @fileoverview E2E tests for the Client Profile page (`/dashboard/clients/:id`).
 * Covers: page rendering, profile header, tabbed sections.
 * @module cypress/e2e/dashboard/client-profile.cy
 */
import { CLIENT_PROFILE, CLIENTS } from "../../support/selectors";

describe("Client Profile Page (/dashboard/clients/:id)", () => {
  beforeEach(() => {
    cy.login("admin");
    // Navigate via the clients table to get a real client ID
    cy.visit("/dashboard/clients");
    cy.get(CLIENTS.ROW_LINK).first().click();
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the client profile page", () => {
    cy.get(CLIENT_PROFILE.PAGE).should("exist").and("be.visible");
  });

  it("should display a profile header", () => {
    cy.get(CLIENT_PROFILE.HEADER).should("exist");
  });

  it("should display client detail sections", () => {
    // Client profile uses sections instead of tabs
    cy.get(CLIENT_PROFILE.PAGE)
      .find("section, .detail-section, .section-title")
      .should("have.length.greaterThan", 0);
  });
});
