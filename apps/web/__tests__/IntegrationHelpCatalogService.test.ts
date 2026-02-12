import { describe, expect, it } from "vitest";
import IntegrationHelpCatalogService, {
  BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS,
} from "../src/services/IntegrationHelpCatalogService";

describe("IntegrationHelpCatalogService", () => {
  it("lists all supported integration help entries", () => {
    const entries = IntegrationHelpCatalogService.listAll();
    const ids = entries.map((entry) => entry.integrationId).sort();

    expect(ids).toEqual([
      "glpi",
      "nextcloud",
      "outlook",
      "sat",
      "whatsapp",
      "zimbra",
    ]);
  });

  it("returns null for unknown integration IDs", () => {
    expect(IntegrationHelpCatalogService.get("invalid-provider")).toBeNull();
    expect(IntegrationHelpCatalogService.get("")).toBeNull();
  });

  it("resolves fallback entry when integration is unknown", () => {
    const resolved = IntegrationHelpCatalogService.resolve("unknown");
    expect(resolved.integrationId).toBe("glpi");
  });

  it("provides complete structured content for each integration", () => {
    for (const entry of IntegrationHelpCatalogService.listAll()) {
      expect(entry.capabilities.length).toBeGreaterThan(0);
      expect(entry.advantages.length).toBeGreaterThan(0);
      expect(entry.howTo.length).toBeGreaterThan(0);
      expect(entry.contextDefinition.length).toBeGreaterThan(10);
    }
  });

  it("exposes bootstrap question-circle icon paths", () => {
    expect(BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS).toHaveLength(3);
    expect(BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS[0]).toContain("A7 7");
  });
});
