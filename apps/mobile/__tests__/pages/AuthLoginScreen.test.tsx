import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import AuthLoginScreen from "../../src/pages/AuthLoginScreen";
import AuthService from "../../src/services/AuthService";
import OAuthService from "../../src/services/OAuthService";
import AlertService from "../../src/services/AlertService";
import AuthRecoveryService from "../../src/services/AuthRecoveryService";
import { NAV_ROUTES } from "../../src/constants";

const mockReplace = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ replace: mockReplace, navigate: mockNavigate }),
}));

jest.mock("../../src/services/AuthService");
jest.mock("../../src/services/OAuthService");
jest.mock("../../src/services/AlertService");
jest.mock("../../src/services/AuthRecoveryService");

describe("AuthLoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(() => "");
    (OAuthService.getProviderAvailability as jest.Mock).mockResolvedValue([
      { provider: "google", enabled: true },
      { provider: "microsoft", enabled: true },
      { provider: "nextcloud", enabled: true },
    ]);
    (AlertService.error as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (AlertService.success as jest.Mock) = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  it("renders OAuth provider buttons", async () => {
    render(<AuthLoginScreen />);

    expect(await screen.findByText("Google")).toBeTruthy();
    expect(screen.getByText("Microsoft")).toBeTruthy();
    expect(screen.getByText("NextCloud")).toBeTruthy();
  });

  it("redirects to 2FA screen when challenge is required", async () => {
    (AuthService.login as jest.Mock).mockResolvedValue({
      requiresTwoFactor: true,
      twoFactorToken: "tf-token",
      email: "admin@corp.local",
    });

    render(<AuthLoginScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "admin@corp.local");
    fireEvent.changeText(screen.getByLabelText("Password"), "Admin#123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(NAV_ROUTES.AUTH.TWO_FACTOR, {
        token: "tf-token",
        email: "admin@corp.local",
      });
    });
  });

  it("does not render visible mock users hint text", () => {
    render(<AuthLoginScreen />);

    expect(screen.queryByText(/Mock users \(seed\)/i)).toBeNull();
  });

  it("starts OAuth flow when pressing provider button", async () => {
    (OAuthService.initiateLogin as jest.Mock).mockResolvedValue(undefined);

    render(<AuthLoginScreen />);

    fireEvent.press(await screen.findByLabelText("Sign in with Google"));

    await waitFor(() => {
      expect(OAuthService.initiateLogin).toHaveBeenCalledWith("google");
    });
  });
});
