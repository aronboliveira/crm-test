import { describe, expect, it } from "vitest";
import {
  getAllIntegrations,
  INTEGRATION_LOGO_PRESENTATION,
} from "../src/utils/constants/integration-constants";

describe("Integration logo presentation tokens", () => {
  it("covers every integration that exposes a logo asset", () => {
    const integrationsWithLogo = getAllIntegrations()
      .filter((integration) => Boolean(integration.logoUrl))
      .map((integration) => integration.id)
      .sort();

    const tokenIds = Object.keys(INTEGRATION_LOGO_PRESENTATION).sort();

    expect(tokenIds).toEqual(integrationsWithLogo);
  });

  it("keeps scale and offset values within a safe visual range", () => {
    for (const [integrationId, token] of Object.entries(
      INTEGRATION_LOGO_PRESENTATION,
    )) {
      expect(integrationId.length).toBeGreaterThan(1);
      expect(token.scale).toBeGreaterThanOrEqual(0.75);
      expect(token.scale).toBeLessThanOrEqual(1.25);

      const offset = token.offsetYRem ?? 0;
      expect(Math.abs(offset)).toBeLessThanOrEqual(0.2);
    }
  });
});
