import { describe, expect, it } from "vitest";
import AdminAuditQueryStateService from "../src/services/AdminAuditQueryStateService";

describe("AdminAuditQueryStateService", () => {
  it("parses compact query keys with trim normalization", () => {
    const state = AdminAuditQueryStateService.fromQuery({
      q: "  user@corp.local ",
      k: "auth.login.failure",
    });

    expect(state).toEqual({
      q: "user@corp.local",
      kind: "auth.login.failure",
    });
  });

  it("serializes only non-default values", () => {
    expect(
      AdminAuditQueryStateService.toQuery(AdminAuditQueryStateService.defaults),
    ).toEqual({});

    expect(
      AdminAuditQueryStateService.toQuery({
        q: "ana@corp.local",
        kind: "admin.user.locked",
      }),
    ).toEqual({
      q: "ana@corp.local",
      k: "admin.user.locked",
    });
  });

  it("compares state equivalence across query and typed state", () => {
    const left = {
      q: "admin@corp.local",
      kind: "auth.login.success",
    };

    expect(
      AdminAuditQueryStateService.isSameState(
        { q: "admin@corp.local", k: "auth.login.success" },
        left,
      ),
    ).toBe(true);
    expect(
      AdminAuditQueryStateService.isSameState(
        { q: "admin@corp.local", k: "auth.login.failure" },
        left,
      ),
    ).toBe(false);
  });
});
