import { describe, expect, it } from "vitest";
import SafeJsonService from "../src/services/SafeJsonService";

describe("SafeJsonService", () => {
  it("parses valid JSON and returns fallback for invalid input", () => {
    expect(SafeJsonService.parse('{"a":1}', {} as Record<string, unknown>)).toEqual({
      a: 1,
    });
    expect(SafeJsonService.parse("invalid", { ok: true })).toEqual({
      ok: true,
    });
  });

  it("parses objects safely", () => {
    expect(SafeJsonService.parseObject('{"k":"v"}')).toEqual({ k: "v" });
    expect(SafeJsonService.parseObject('["x"]')).toEqual({});
    expect(SafeJsonService.parseObject(null, { fallback: 1 })).toEqual({
      fallback: 1,
    });
  });

  it("stringifies safely", () => {
    expect(SafeJsonService.stringify({ k: "v" })).toBe('{"k":"v"}');
    expect(SafeJsonService.stringify({ k: "v" }, "{}", 2)).toBe(
      '{\n  "k": "v"\n}',
    );

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(SafeJsonService.tryStringify(circular)).toBeNull();
    expect(SafeJsonService.stringify(circular, "{}")).toBe("{}");
  });
});
