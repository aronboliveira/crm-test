import { describe, expect, it } from "vitest";
import ImportInputSuggestionService from "../src/utils/import/ImportInputSuggestionService";

describe("ImportInputSuggestionService", () => {
  it("normalizes API items into a field map", () => {
    const map = ImportInputSuggestionService.toFieldMap([
      {
        field: "name",
        suggestions: [
          { value: "Ana Souza", score: 18 },
          { value: "Bruno Lima", score: 8 },
        ],
      },
    ]);

    expect(map.name?.length).toBe(2);
    expect(map.name?.[0]?.value).toBe("Ana Souza");
  });

  it("prioritizes prefix matches while respecting base score", () => {
    const values = ImportInputSuggestionService.rankValues(
      [
        { value: "Ana Souza", score: 10 },
        { value: "Anabela Castro", score: 20 },
        { value: "Carlos Lima", score: 100 },
      ],
      "ana",
      5,
    );

    expect(values[0]).toBe("Anabela Castro");
    expect(values).toContain("Ana Souza");
    expect(values).not.toContain("Carlos Lima");
  });
});
