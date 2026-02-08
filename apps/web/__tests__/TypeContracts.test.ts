import { describe, it, expect } from "vitest";
import type { PermissionKey } from "../src/types/permissions.types";
import type {
  SessionUser,
  UserProfile,
  LoginResponse,
  ResetResponse,
} from "../src/types/auth.types";

/**
 * Contract/shape tests — ensure that the type definitions
 * compile correctly and satisfy real-world usage patterns.
 */
describe("Type contracts", () => {
  describe("PermissionKey exhaustiveness", () => {
    it("should accept all known resource.action combinations", () => {
      const allKeys: PermissionKey[] = [
        "projects.read",
        "projects.write",
        "projects.manage",
        "tasks.read",
        "tasks.write",
        "tasks.manage",
        "users.read",
        "users.write",
        "users.manage",
        "roles.read",
        "roles.write",
        "roles.manage",
        "permissions.read",
        "permissions.manage",
        "audit.read",
      ];
      expect(allKeys).toHaveLength(15);
      allKeys.forEach((k) => expect(k).toMatch(/^[a-z]+\.(read|write|manage)$/));
    });
  });

  describe("SessionUser contract", () => {
    it("should work with all required fields", () => {
      const user: SessionUser = {
        sub: "abc-123",
        email: "admin@corp.local",
        roles: ["admin", "manager"],
        perms: ["projects.read", "users.manage"],
      };
      expect(user.sub).toBe("abc-123");
      expect(user.roles).toHaveLength(2);
      expect(user.perms).toContain("users.manage");
    });

    it("should allow empty arrays for roles and perms", () => {
      const user: SessionUser = {
        sub: "id",
        email: "a@b.com",
        roles: [],
        perms: [],
      };
      expect(user.roles).toHaveLength(0);
      expect(user.perms).toHaveLength(0);
    });
  });

  describe("UserProfile contract", () => {
    it("should work with minimal fields", () => {
      const profile: UserProfile = { id: "1", email: "test@test.com" };
      expect(profile.id).toBe("1");
      expect(profile.name).toBeUndefined();
    });

    it("should accept optional name", () => {
      const profile: UserProfile = {
        id: "1",
        email: "test@test.com",
        name: "Test User",
      };
      expect(profile.name).toBe("Test User");
    });
  });

  describe("LoginResponse contract", () => {
    it("should accept SessionUser as user", () => {
      const resp: LoginResponse = {
        accessToken: "jwt-token-here",
        user: { sub: "1", email: "a@b.com", roles: [], perms: [] },
      };
      expect(resp.accessToken).toBeTruthy();
      expect("sub" in resp.user).toBe(true);
    });

    it("should accept UserProfile as user", () => {
      const resp: LoginResponse = {
        accessToken: "jwt-token-here",
        user: { id: "1", email: "a@b.com" },
      };
      expect("id" in resp.user).toBe(true);
    });
  });

  describe("ResetResponse contract", () => {
    it("should work with devResetToken", () => {
      const resp: ResetResponse = { devResetToken: "abc123" };
      expect(resp.devResetToken).toBe("abc123");
    });

    it("should work without devResetToken", () => {
      const resp: ResetResponse = {};
      expect(resp.devResetToken).toBeUndefined();
    });
  });
});
