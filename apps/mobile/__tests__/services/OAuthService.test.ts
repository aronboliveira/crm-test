jest.mock("react-native", () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

import { Linking } from "react-native";

import OAuthService from "../../src/services/OAuthService";
import ApiClientService from "../../src/services/ApiClientService";
import AlertService from "../../src/services/AlertService";

jest.mock("../../src/services/ApiClientService");
jest.mock("../../src/services/AlertService");

describe("OAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
    (AlertService.info as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (AlertService.error as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  it("fetches provider availability from backend", async () => {
    (ApiClientService.raw.get as jest.Mock).mockResolvedValue({
      data: [{ provider: "google", enabled: true }],
    });

    const result = await OAuthService.getProviderAvailability();

    expect(ApiClientService.raw.get).toHaveBeenCalledWith(
      "/auth/oauth/providers",
    );
    expect(result).toEqual([{ provider: "google", enabled: true }]);
  });

  it("opens external URL for provider login", async () => {
    await OAuthService.initiateLogin("google");

    expect(Linking.canOpenURL).toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalled();
    expect(AlertService.info).toHaveBeenCalled();
  });

  it("shows error when provider URL cannot be opened", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await expect(OAuthService.initiateLogin("google")).rejects.toThrow();
    expect(AlertService.error).toHaveBeenCalled();
  });
});
