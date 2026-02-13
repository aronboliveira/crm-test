import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationConfigAutocompleteService from "../src/services/IntegrationConfigAutocompleteService";

describe("IntegrationConfigAutocompleteService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("keeps localhost defaults at the end of baseUrl suggestions", () => {
    const service = new IntegrationConfigAutocompleteService();

    const suggestions = service.listSuggestions("glpi", "baseUrl");

    expect(suggestions).toContain("http://localhost");
    expect(suggestions).toContain("http://localhost:8080");
  });

  it("persists values only after idle delay", () => {
    const service = new IntegrationConfigAutocompleteService();

    service.schedulePersist("sat", "companyId", "CORP-001");
    expect(service.listSuggestions("sat", "companyId")).not.toContain("CORP-001");

    vi.advanceTimersByTime(IntegrationConfigAutocompleteService.persistDelayMs());

    expect(service.listSuggestions("sat", "companyId")).toContain("CORP-001");
  });

  it("resets timer when input changes before delay", () => {
    const service = new IntegrationConfigAutocompleteService();

    service.schedulePersist("nextcloud", "defaultFolder", "/Financeiro");
    vi.advanceTimersByTime(2_000);
    service.schedulePersist("nextcloud", "defaultFolder", "/Operacoes");
    vi.advanceTimersByTime(3_000);

    expect(service.listSuggestions("nextcloud", "defaultFolder")).not.toContain(
      "/Financeiro",
    );
    expect(service.listSuggestions("nextcloud", "defaultFolder")).not.toContain(
      "/Operacoes",
    );

    vi.advanceTimersByTime(2_000);
    expect(service.listSuggestions("nextcloud", "defaultFolder")).toContain(
      "/Operacoes",
    );
  });

  it("skips sensitive fields from persistence", () => {
    const service = new IntegrationConfigAutocompleteService();

    service.persistNow("glpi", "appToken", "secret-value");
    service.persistNow("outlook", "clientSecret", "another-secret");

    expect(service.listSuggestions("glpi", "appToken")).toEqual([]);
    expect(service.listSuggestions("outlook", "clientSecret")).toEqual([]);
  });

  it("supports batched persistence using form/input keys", () => {
    const service = new IntegrationConfigAutocompleteService();

    service.persistBatch("whatsapp", {
      businessAccountId: "1234567890",
      phoneNumberId: "9988776655",
      apiVersion: "v18.0",
    });

    expect(service.listSuggestions("whatsapp", "businessAccountId")).toContain(
      "1234567890",
    );
    expect(service.listSuggestions("whatsapp", "phoneNumberId")).toContain(
      "9988776655",
    );
    expect(service.listSuggestions("whatsapp", "apiVersion")).toContain("v18.0");
  });

  it("limits visible suggestions to five items", () => {
    const service = new IntegrationConfigAutocompleteService();

    for (let index = 1; index <= 9; index += 1) {
      service.persistNow("nextcloud", "defaultFolder", `/folder-${index}`);
    }

    const suggestions = service.listSuggestions("nextcloud", "defaultFolder", 20);
    expect(suggestions).toHaveLength(5);
  });
});
