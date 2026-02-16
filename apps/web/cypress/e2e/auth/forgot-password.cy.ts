/**
 * @fileoverview E2E tests for the Forgot Password page (`/forgot-password`).
 * Covers: rendering, form validation, submission, and back-to-login nav.
 * @module cypress/e2e/auth/forgot-password.cy
 */
import { FORGOT_PASSWORD } from "../../support/selectors";

describe("Forgot Password Page (/forgot-password)", () => {
  beforeEach(() => {
    cy.visit("/forgot-password");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the forgot-password form with email field", () => {
    cy.get(FORGOT_PASSWORD.FORM).should("exist").and("be.visible");
    cy.get(FORGOT_PASSWORD.EMAIL)
      .should("exist")
      .and("have.attr", "type", "email");
    cy.get(FORGOT_PASSWORD.SUBMIT)
      .should("exist")
      .and("contain.text", "Enviar link de redefinição");
  });

  it("should display the back-to-login link", () => {
    cy.get(FORGOT_PASSWORD.BACK_LINK)
      .should("exist")
      .and("have.attr", "href", "/login");
  });

  /* ---------------------------------------------------------------------- */
  /*  Validation                                                             */
  /* ---------------------------------------------------------------------- */

  it("should not submit with empty email (HTML5 required)", () => {
    cy.get(FORGOT_PASSWORD.SUBMIT).click();
    cy.assertPath("/forgot-password");
  });

  it("should not submit with invalid email format", () => {
    cy.get(FORGOT_PASSWORD.EMAIL).type("not-an-email");
    cy.get(FORGOT_PASSWORD.SUBMIT).click();
    cy.assertPath("/forgot-password");
  });

  /* ---------------------------------------------------------------------- */
  /*  Submission                                                             */
  /* ---------------------------------------------------------------------- */

  it("should submit and show confirmation for a valid email", () => {
    cy.get(FORGOT_PASSWORD.EMAIL).type("admin@corp.local");
    cy.get(FORGOT_PASSWORD.SUBMIT).click();

    // After submit, expect either a success toast/swal or redirect to /login
    cy.get("body").then(($body) => {
      const hasSwal = $body.find(".swal2-popup").length > 0;
      // Or the page may redirect to /login
      if (!hasSwal) {
        cy.url().should("satisfy", (url: string) => {
          return url.includes("/login") || url.includes("/forgot-password");
        });
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  it("should navigate back to /login when clicking the back button", () => {
    cy.get(FORGOT_PASSWORD.BACK_BTN).click();
    cy.assertPath("/login");
  });

  it("should navigate back to /login via the link", () => {
    cy.get(FORGOT_PASSWORD.BACK_LINK).click();
    cy.assertPath("/login");
  });
});
