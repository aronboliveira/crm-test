/**
 * @fileoverview Custom Cypress commands for the CRM app.
 * Provides reusable login, session, and navigation helpers.
 * @module cypress/support/commands
 */
import { SEED_USERS, type SeedUserKey } from "../fixtures/users.ts";

/* -------------------------------------------------------------------------- */
/*  Type augmentation                                                         */
/* -------------------------------------------------------------------------- */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Programmatic login via API, storing the JWT in sessionStorage.
       * @param role - Seed user key (admin | manager | member | viewer)
       */
      login(role?: SeedUserKey): Chainable<void>;

      /**
       * Login through the UI form.
       * @param email - User email
       * @param password - User password
       */
      loginViaUI(email: string, password: string): Chainable<void>;

      /**
       * Assert the current URL path matches exactly.
       * @param path - Expected pathname
       */
      assertPath(path: string): Chainable<void>;

      /**
       * Assert the current URL path starts with a prefix.
       * @param prefix - Expected pathname prefix
       */
      assertPathStartsWith(prefix: string): Chainable<void>;

      /**
       * Navigate via sidebar menu by nav key.
       * @param key - The `data-nav-key` attribute value
       */
      navTo(key: string): Chainable<void>;

      /**
       * Get an element by its `data-testid` attribute.
       * @param testId - Value of `data-testid`
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Get an element by its `id` attribute.
       * @param id - The element ID
       */
      getById(id: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Session storage-based auth token constant                                 */
/* -------------------------------------------------------------------------- */

/** @internal Session storage key used by the app's auth store */
const AUTH_TOKEN_KEY = "_auth_token_v1";

const injectAuthToken = (win: Window, token: string): void => {
  win.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

/* -------------------------------------------------------------------------- */
/*  Commands                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Programmatic login via the API.
 * Sets the JWT in sessionStorage so the app's auth store bootstraps correctly.
 */
Cypress.Commands.add("login", (role: SeedUserKey = "admin") => {
  const user = SEED_USERS[role];
  const apiUrl = String(Cypress.env("apiUrl") || "http://localhost:3000");

  cy.request({
    method: "POST",
    url: `${apiUrl}/auth/login`,
    body: { email: user.email, password: user.password },
  }).then((res) => {
    expect(res.status).to.eq(201);
    const token: string = res.body?.accessToken ?? res.body?.access_token ?? "";
    expect(token).to.be.a("string").and.not.be.empty;

    cy.request({
      method: "GET",
      url: `${apiUrl}/auth/me`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((meRes) => {
      expect(meRes.status).to.eq(200);
      const me = meRes.body ?? {};

      cy.intercept("GET", "**/auth/me*", {
        statusCode: 200,
        body: me,
      });

      // Seed token in the real app window before the app bootstraps.
      cy.visit("/", {
        onBeforeLoad(win) {
          injectAuthToken(win, token);
        },
      });

      // Defensive re-assertion in case app code clears/replaces storage on boot.
      cy.window().then((win) => {
        injectAuthToken(win, token);
      });
    });
  });
});

/**
 * Login using the actual UI form (for auth flow E2E coverage).
 */
Cypress.Commands.add("loginViaUI", (email: string, password: string) => {
  cy.visit("/login");
  cy.get('input[name="email"]').clear().type(email);
  cy.get('input[name="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
});

/** Assert exact pathname */
Cypress.Commands.add("assertPath", (path: string) => {
  cy.location("pathname").should("eq", path);
});

/** Assert pathname starts with prefix */
Cypress.Commands.add("assertPathStartsWith", (prefix: string) => {
  cy.location("pathname").should("match", new RegExp(`^${prefix}`));
});

/** Click a sidebar nav item by its key */
Cypress.Commands.add("navTo", (key: string) => {
  cy.get(`[data-nav-key="${key}"]`).click();
});

/** Select element by data-testid */
Cypress.Commands.add("getByTestId", (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/** Select element by id */
Cypress.Commands.add("getById", (id: string) => {
  return cy.get(`#${id}`);
});

export {};
