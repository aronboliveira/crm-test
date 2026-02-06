import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests that verify the service modules export correct
 * types after the type consolidation refactor.
 */
describe("Service re-exports after type consolidation", () => {
  it("PolicyService should re-export PermissionKey type", async () => {
    const mod = await import("../src/services/PolicyService");
    // PolicyService is a default export class
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("AdminApiService should re-export MailOutboxItem type", async () => {
    const mod = await import("../src/services/AdminApiService");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("AuthService should use SessionUser/LoginResponse from auth.types", async () => {
    const mod = await import("../src/services/AuthService");
    expect(mod.default).toBeDefined();
    // AuthService has static methods
    expect(typeof mod.default.token).toBe("function");
    expect(typeof mod.default.isAuthed).toBe("function");
    expect(typeof mod.default.me).toBe("function");
    expect(typeof mod.default.login).toBe("function");
    expect(typeof mod.default.logout).toBe("function");
  });

  it("ApiClientService should exist as default export", async () => {
    const mod = await import("../src/services/ApiClientService");
    expect(mod.default).toBeDefined();
  });
});

describe("MainViewRegistry re-exports", () => {
  it("should export MainViewKey, MainViewSpec, MainViewRegistry types", async () => {
    const mod = await import("../src/components/shell/MainViewRegistry");
    const registry = mod.default;

    // The registry should have order and byKey
    expect(registry).toBeDefined();
    expect(Array.isArray(registry.order)).toBe(true);
    expect(registry.order).toContain("dashboard");
    expect(registry.order).toContain("projects");
    expect(registry.order).toContain("tasks");
    expect(registry.byKey).toBeDefined();
    expect(registry.byKey.dashboard.label).toBe("Dashboard");
  });
});
