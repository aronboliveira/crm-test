import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmartAutocompleteService from "../src/services/SmartAutocompleteService";

describe("SmartAutocompleteService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("persists values only after 5 seconds of idle typing", () => {
    const service = new SmartAutocompleteService("devices-host");
    service.commit("host-001");

    expect(service.suggest("host")).toEqual([]);

    vi.advanceTimersByTime(4_999);
    expect(service.suggest("host")).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(service.suggest("host")).toEqual(["host-001"]);
  });

  it("persists values immediately when commitSubmitted is called", () => {
    const service = new SmartAutocompleteService("devices-model");

    service.commitSubmitted("Latitude 7440");

    expect(service.suggest("lat")).toEqual(["Latitude 7440"]);
  });

  it("returns at most 5 suggestions even if a larger limit is requested", () => {
    const service = new SmartAutocompleteService("devices-name");
    for (let index = 1; index <= 8; index += 1) {
      service.commitSubmitted(`device-${index}`);
    }

    const suggestions = service.suggest("device", 99);

    expect(suggestions).toHaveLength(5);
    expect(suggestions).toEqual([
      "device-8",
      "device-7",
      "device-6",
      "device-5",
      "device-4",
    ]);
  });
});
