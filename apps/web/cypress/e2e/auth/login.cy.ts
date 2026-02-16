/**
 * @fileoverview E2E tests for the Login page (`/login`).
 * Covers: UI rendering, validation, successful login, failed login,
 *         password visibility toggle, and redirect after auth.
 * @module cypress/e2e/auth/login.cy
 */
import { LOGIN } from "../../support/selectors";
import { SEED_USERS } from "../../fixtures/users.ts";

describe("Login Page (/login)", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  /* ---------------------------------------------------------------------- */
  /*  Rendering                                                              */
  /* ---------------------------------------------------------------------- */

  it("should render the login form with email and password fields", () => {
    cy.get(LOGIN.FORM).should("exist").and("be.visible");
    cy.get(LOGIN.EMAIL).should("exist").and("have.attr", "type", "email");
    cy.get(LOGIN.PASSWORD).should("exist");
    cy.get(LOGIN.SUBMIT).should("exist").and("contain.text", "Entrar");
  });

  it("should display seed credential hints", () => {
    cy.get(LOGIN.SUBMIT)
      .should("have.attr", "title")
      .and("contain", "admin@corp.local");
  });

  it("should show the forgot-password link", () => {
    cy.get(LOGIN.FORGOT_LINK)
      .should("exist")
      .and("have.attr", "href", "/forgot-password");
  });

  /* ---------------------------------------------------------------------- */
  /*  Validation                                                             */
  /* ---------------------------------------------------------------------- */

  it("should not submit when fields are empty (HTML5 required)", () => {
    cy.get(LOGIN.SUBMIT).click();
    // Form should still be on the login page — no navigation
    cy.assertPath("/login");
  });

  it("should not submit with invalid email format", () => {
    cy.get(LOGIN.EMAIL).type("not-an-email");
    cy.get(LOGIN.PASSWORD).type("SomePass#1");
    cy.get(LOGIN.SUBMIT).click();
    cy.assertPath("/login");
  });

  /* ---------------------------------------------------------------------- */
  /*  Password visibility toggle                                             */
  /* ---------------------------------------------------------------------- */

  it("should toggle password visibility on button click", () => {
    cy.get(LOGIN.PASSWORD).should("have.attr", "type", "password");
    cy.get(LOGIN.TOGGLE_PASSWORD).click();
    cy.get(LOGIN.PASSWORD).should("have.attr", "type", "text");
    cy.get(LOGIN.TOGGLE_PASSWORD).click();
    cy.get(LOGIN.PASSWORD).should("have.attr", "type", "password");
  });

  /* ---------------------------------------------------------------------- */
  /*  Successful login                                                       */
  /* ---------------------------------------------------------------------- */

  it("should log in with admin seed credentials and redirect to /dashboard", () => {
    const { email, password } = SEED_USERS.admin;

    cy.get(LOGIN.EMAIL).type(email);
    cy.get(LOGIN.PASSWORD).type(password);
    cy.get(LOGIN.SUBMIT).click();

    // Should navigate away from /login
    cy.url().should("not.include", "/login");
    cy.assertPathStartsWith("/dashboard");
  });

  it("should log in with manager seed credentials", () => {
    const { email, password } = SEED_USERS.manager;

    cy.get(LOGIN.EMAIL).type(email);
    cy.get(LOGIN.PASSWORD).type(password);
    cy.get(LOGIN.SUBMIT).click();

    cy.url().should("not.include", "/login");
  });

  /* ---------------------------------------------------------------------- */
  /*  Failed login                                                           */
  /* ---------------------------------------------------------------------- */

  it("should show error feedback on wrong credentials", () => {
    cy.get(LOGIN.EMAIL).type("wrong@corp.local");
    cy.get(LOGIN.PASSWORD).type("WrongPass#1");
    cy.get(LOGIN.SUBMIT).click();

    // Should stay on login page
    cy.assertPath("/login");
    // Sweetalert2, toast, or inline error should appear
    cy.get("body").then(($body) => {
      const hasSwalError = $body.find(".swal2-popup").length > 0;
      const hasInlineError =
        $body.find('[role="alert"], .auth-error, .error-message').length > 0;
      expect(hasSwalError || hasInlineError).to.be.true;
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Auth guard redirect                                                    */
  /* ---------------------------------------------------------------------- */

  it("should redirect unauthenticated users from /dashboard to /login", () => {
    // Clear any stored session
    cy.window().then((win) => win.sessionStorage.clear());
    cy.visit("/dashboard");
    cy.assertPath("/login");
  });

  it("should preserve ?next= query for post-login redirect", () => {
    cy.window().then((win) => win.sessionStorage.clear());
    cy.visit("/dashboard/projects");
    cy.location("search").should("include", "next=");
  });
});
