import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import Auth2FAScreen from "../../src/pages/Auth2FAScreen";
import AuthService from "../../src/services/AuthService";
import AlertService from "../../src/services/AlertService";
import { NAV_ROUTES } from "../../src/constants";

const mockReplace = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ replace: mockReplace }),
  useRoute: () => ({
    params: { token: "tf-token", email: "admin@corp.local" },
  }),
}));

jest.mock("../../src/services/AuthService");
jest.mock("../../src/services/AlertService");

describe("Auth2FAScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AlertService.error as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (AlertService.success as jest.Mock) = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  it("renders two-step verification UI", () => {
    render(<Auth2FAScreen />);

    expect(screen.getByText("Two-step verification")).toBeTruthy();
    expect(screen.getByLabelText("2FA code")).toBeTruthy();
  });

  it("shows error when code is empty", async () => {
    render(<Auth2FAScreen />);
    fireEvent.press(screen.getByLabelText("Verify 2FA code"));

    await waitFor(() => {
      expect(AlertService.error).toHaveBeenCalled();
    });
  });

  it("verifies code and redirects to dashboard", async () => {
    (AuthService.verifyTwoFactor as jest.Mock).mockResolvedValue({
      accessToken: "jwt",
      user: { id: "1", email: "admin@corp.local" },
    });

    render(<Auth2FAScreen />);
    fireEvent.changeText(screen.getByLabelText("2FA code"), "123456");
    fireEvent.press(screen.getByLabelText("Verify 2FA code"));

    await waitFor(() => {
      expect(AuthService.verifyTwoFactor).toHaveBeenCalledWith(
        "tf-token",
        "123456",
      );
      expect(mockReplace).toHaveBeenCalledWith(NAV_ROUTES.DASHBOARD.HOME);
    });
  });

  it("toggles to recovery code mode", () => {
    render(<Auth2FAScreen />);

    fireEvent.press(screen.getByLabelText("Use recovery code"));
    expect(screen.getByLabelText("Recovery code")).toBeTruthy();
  });
});
