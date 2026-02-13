import { describe, expect, it } from "vitest";
import AdminMailOutboxQueryStateService from "../src/services/AdminMailOutboxQueryStateService";

describe("AdminMailOutboxQueryStateService", () => {
  it("parses compact query keys with enum normalization", () => {
    const state = AdminMailOutboxQueryStateService.fromQuery({
      q: "  invite@corp.local ",
      k: "password_invite",
    });

    expect(state).toEqual({
      q: "invite@corp.local",
      kind: "password_invite",
    });

    const fallback = AdminMailOutboxQueryStateService.fromQuery({
      q: "   ",
      k: "invalid",
    });

    expect(fallback).toEqual(AdminMailOutboxQueryStateService.defaults);
  });

  it("serializes only non-default values", () => {
    expect(
      AdminMailOutboxQueryStateService.toQuery(
        AdminMailOutboxQueryStateService.defaults,
      ),
    ).toEqual({});

    expect(
      AdminMailOutboxQueryStateService.toQuery({
        q: "admin@corp.local",
        kind: "generic",
      }),
    ).toEqual({
      q: "admin@corp.local",
      k: "generic",
    });
  });

  it("compares state equivalence between query and typed state", () => {
    const state = {
      q: "ops@corp.local",
      kind: "password_invite",
    };

    expect(
      AdminMailOutboxQueryStateService.isSameState(
        { q: "ops@corp.local", k: "password_invite" },
        state,
      ),
    ).toBe(true);

    expect(
      AdminMailOutboxQueryStateService.isSameState(
        { q: "ops@corp.local", k: "generic" },
        state,
      ),
    ).toBe(false);
  });
});
