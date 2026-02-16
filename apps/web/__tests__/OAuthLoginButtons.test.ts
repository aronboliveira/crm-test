import { beforeEach, describe, expect, it, vi } from "vitest";
import OAuthService from "../src/services/OAuthService";
import ApiClientService from "../src/services/ApiClientService";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("../src/services/ApiClientService", () => ({
  default: {
    raw: {
      get: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("OAuth login buttons and service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthLoginPage should expose unified OAuth accessibility attrs", async () => {
    const content = readFileSync(
      resolve(__dirname, "../src/pages/AuthLoginPage.vue"),
      "utf8",
    );

    expect(content).toContain('v-for="provider in oauthProviders"');
    expect(content).toContain(":aria-label=");
    expect(content).toContain(":aria-disabled=");
    expect(content).toContain(":title=");
    expect(content).toContain("auth-sso-btn--active");
    expect(content).toContain("auth-sso-btn--unavailable");
  });

  it("OAuthService.getProviderAvailability should return backend payload", async () => {
    const payload = [
      { provider: "google", enabled: true },
      {
        provider: "microsoft",
        enabled: false,
        reason: "Microsoft SSO indisponível no momento",
      },
    ];

    const apiRaw = (ApiClientService as any).raw;
    apiRaw.get.mockResolvedValueOnce({ data: payload });

    const result = await OAuthService.getProviderAvailability();

    expect(apiRaw.get).toHaveBeenCalledWith("/auth/oauth/providers");
    expect(result).toEqual(payload);
  });
});
