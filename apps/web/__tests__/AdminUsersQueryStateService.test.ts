import { describe, expect, it } from "vitest";
import AdminUsersQueryStateService from "../src/services/AdminUsersQueryStateService";

describe("AdminUsersQueryStateService", () => {
  it("parses compact query keys with normalization", () => {
    const state = AdminUsersQueryStateService.fromQuery({
      q: "  admin  ",
      r: "manager",
    });

    expect(state).toEqual({
      q: "admin",
      roleKey: "manager",
    });

    const fallback = AdminUsersQueryStateService.fromQuery({
      q: "   ",
      r: "invalid-role",
    });

    expect(fallback).toEqual(AdminUsersQueryStateService.defaults);
  });

  it("serializes only non-default values", () => {
    expect(
      AdminUsersQueryStateService.toQuery(AdminUsersQueryStateService.defaults),
    ).toEqual({});

    expect(
      AdminUsersQueryStateService.toQuery({
        q: "ops@corp.local",
        roleKey: "admin",
      }),
    ).toEqual({
      q: "ops@corp.local",
      r: "admin",
    });
  });
});
