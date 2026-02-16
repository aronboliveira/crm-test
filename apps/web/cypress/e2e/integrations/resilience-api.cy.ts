/**
 * @fileoverview API-level Cypress tests for Integrations resilience endpoints.
 * Covers: listing integrations, health checks, resilience snapshot shape,
 *         and resilience counters after connection tests.
 * @module cypress/e2e/integrations/resilience-api.cy
 */
import { SEED_USERS } from "../../fixtures/users.ts";

describe("Integrations Resilience API", () => {
  const apiUrl = String(Cypress.env("apiUrl") || "http://localhost:3000");

  const getAuthToken = (): Cypress.Chainable<string> => {
    return cy
      .request({
        method: "POST",
        url: `${apiUrl}/auth/login`,
        body: {
          email: SEED_USERS.admin.email,
          password: SEED_USERS.admin.password,
        },
      })
      .then((res) => {
        expect(res.status).to.eq(201);
        const token = String(
          res.body?.accessToken ?? res.body?.access_token ?? "",
        );
        expect(token).to.not.eq("");
        return token;
      });
  };

  it("should list integrations for an authenticated admin", () => {
    getAuthToken().then((token) => {
      cy.request({
        method: "GET",
        url: `${apiUrl}/integrations`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array").and.have.length.greaterThan(0);

        const ids = (res.body as Array<{ id?: string }>)
          .map((item) => String(item?.id || ""))
          .filter(Boolean);

        expect(ids).to.include.members(["glpi", "sat", "nextcloud"]);
      });
    });
  });

  it("should return health and resilience snapshots for listed integrations", () => {
    getAuthToken().then((token) => {
      cy.request({
        method: "GET",
        url: `${apiUrl}/integrations`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((listRes) => {
        const integrations = (listRes.body as Array<{ id?: string }>)
          .map((item) => String(item?.id || ""))
          .filter(Boolean)
          .slice(0, 3);

        expect(integrations.length).to.be.greaterThan(0);

        integrations.forEach((integrationId) => {
          cy.request({
            method: "GET",
            url: `${apiUrl}/integrations/${integrationId}/health`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((healthRes) => {
            expect(healthRes.status).to.eq(200);
            expect(healthRes.body).to.have.property(
              "integration",
              integrationId,
            );
            expect(healthRes.body).to.have.property("configured");
            expect(healthRes.body).to.have.property("connected");
            expect(healthRes.body).to.have.property("details");
            expect(healthRes.body.details).to.have.property("lastCheck");
          });

          cy.request({
            method: "GET",
            url: `${apiUrl}/integrations/${integrationId}/resilience`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((resilienceRes) => {
            expect(resilienceRes.status).to.eq(200);
            expect(resilienceRes.body).to.have.property(
              "integration",
              integrationId,
            );
            expect(resilienceRes.body).to.have.property("circuits");
            expect(resilienceRes.body.circuits).to.be.an("array");
            expect(resilienceRes.body).to.have.property("generatedAt");
          });
        });
      });
    });
  });

  it("should expose resilience counters after test-connection attempts", () => {
    const targetIntegration = "nextcloud";

    getAuthToken().then((token) => {
      cy.request({
        method: "GET",
        url: `${apiUrl}/integrations/${targetIntegration}/resilience`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((beforeRes) => {
        const beforeCircuits = Array.isArray(beforeRes.body?.circuits)
          ? beforeRes.body.circuits
          : [];

        cy.request({
          method: "POST",
          url: `${apiUrl}/integrations/${targetIntegration}/test`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          failOnStatusCode: false,
        }).then((testRes) => {
          expect([200, 400, 401, 403, 404, 500]).to.include(testRes.status);

          cy.request({
            method: "GET",
            url: `${apiUrl}/integrations/${targetIntegration}/resilience`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((afterRes) => {
            const afterCircuits = Array.isArray(afterRes.body?.circuits)
              ? afterRes.body.circuits
              : [];

            expect(afterRes.status).to.eq(200);
            expect(afterRes.body).to.have.property(
              "integration",
              targetIntegration,
            );

            expect(afterCircuits.length).to.be.greaterThan(
              beforeCircuits.length - 1,
            );

            if (afterCircuits.length > 0) {
              const hasOperationStats = afterCircuits.some(
                (circuit: {
                  operation?: string;
                  fires?: number;
                  failures?: number;
                  successes?: number;
                  rejects?: number;
                  timeouts?: number;
                }) => {
                  return (
                    typeof circuit.operation === "string" &&
                    typeof circuit.fires === "number" &&
                    typeof circuit.failures === "number" &&
                    typeof circuit.successes === "number" &&
                    typeof circuit.rejects === "number" &&
                    typeof circuit.timeouts === "number"
                  );
                },
              );

              expect(hasOperationStats).to.eq(true);
            }
          });
        });
      });
    });
  });
});
