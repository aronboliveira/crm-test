import { describe, expect, it } from "vitest";
import InputSuggestionListService from "../src/services/InputSuggestionListService";

describe("InputSuggestionListService", () => {
  it("normalizes and deduplicates entries using min length and max entries", () => {
    const service = new InputSuggestionListService({
      minLength: 2,
      maxEntries: 4,
      maxSuggestions: 3,
    });

    const normalized = service.normalizeEntries([
      "Dell",
      "dell",
      "HP",
      "A",
      " Lenovo ",
      "Asus",
      "Samsung",
    ]);

    expect(normalized).toEqual(["Dell", "HP", "Lenovo", "Asus"]);
  });

  it("clamps suggestion limits and applies query filtering", () => {
    const service = new InputSuggestionListService({
      maxEntries: 8,
      maxSuggestions: 5,
    });
    const values = ["Latitude 7440", "Latam VM", "Server Node", "Laptop QA"];

    expect(service.clampSuggestionLimit(99)).toBe(5);
    expect(service.query(values, "la", 99)).toEqual([
      "Latitude 7440",
      "Latam VM",
      "Laptop QA",
    ]);
  });
});
