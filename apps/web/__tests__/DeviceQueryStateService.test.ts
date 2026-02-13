import { describe, expect, it } from "vitest";
import DeviceQueryStateService from "../src/services/DeviceQueryStateService";

describe("DeviceQueryStateService", () => {
  it("parses minimal query keys and normalizes invalid values", () => {
    const state = DeviceQueryStateService.fromQuery({
      q: "  vm host  ",
      s: "online",
      k: "virtual",
      p: "3",
      z: "25",
      b: "name",
      d: "asc",
    });

    expect(state).toEqual({
      q: "vm host",
      status: "online",
      kind: "virtual",
      page: 3,
      pageSize: 25,
      sortBy: "name",
      sortDir: "asc",
    });

    const fallback = DeviceQueryStateService.fromQuery({
      s: "bad",
      k: "bad",
      p: "-1",
      z: "999",
      b: "bad",
      d: "bad",
    });

    expect(fallback).toEqual({
      ...DeviceQueryStateService.defaults,
      pageSize: 50,
    });
  });

  it("serializes only non-default keys", () => {
    expect(DeviceQueryStateService.toQuery(DeviceQueryStateService.defaults)).toEqual(
      {},
    );

    const query = DeviceQueryStateService.toQuery({
      ...DeviceQueryStateService.defaults,
      q: "router",
      kind: "physical",
      page: 2,
      sortBy: "status",
      sortDir: "asc",
    });

    expect(query).toEqual({
      q: "router",
      k: "physical",
      p: "2",
      b: "status",
      d: "asc",
    });
  });

  it("compares route state equivalence regardless object source", () => {
    const left = DeviceQueryStateService.fromQuery({
      q: "router",
      s: "online",
      p: "2",
    });
    const right = {
      q: "router",
      status: "online" as const,
      kind: "all" as const,
      page: 2,
      pageSize: 10,
      sortBy: "updatedAt" as const,
      sortDir: "desc" as const,
    };

    expect(DeviceQueryStateService.isSameState(left, right)).toBe(true);
    expect(
      DeviceQueryStateService.isSameState(left, {
        ...right,
        page: 3,
      }),
    ).toBe(false);
  });
});
