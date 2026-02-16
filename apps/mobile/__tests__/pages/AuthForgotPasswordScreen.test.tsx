/**
 * AuthForgotPasswordScreen Tests
 *
 * Comprehensive test suite for password recovery screen.
 * Tests form persistence, validation, API integration, dev token modal, and navigation.
 */

import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Clipboard from "@react-native-clipboard/clipboard";

import AuthForgotPasswordScreen from "../../src/pages/AuthForgotPasswordScreen";
import AuthRecoveryService from "../../src/services/AuthRecoveryService";
import AlertService from "../../src/services/AlertService";
import { STORAGE_KEYS, NAV_ROUTES } from "../../src/constants";

// Mock navigation
const mockReplace = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
}));

// Mock services
jest.mock("../../src/services/AuthRecoveryService");
jest.mock("../../src/services/AlertService");

// Mock clipboard
jest.mock("@react-native-clipboard/clipboard", () => ({
  setString: jest.fn(),
}));

describe("AuthForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Default mock implementations
    (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(() => "");
    (AuthRecoveryService.setLastEmail as jest.Mock) = jest.fn();
    (AuthRecoveryService.setLastToken as jest.Mock) = jest.fn();
    (AuthRecoveryService.requestReset as jest.Mock) = jest
      .fn()
      .mockResolvedValue({ ok: true });
    (AlertService.error as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (AlertService.success as jest.Mock) = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  describe("Initial Load", () => {
    it("should render the screen with all elements", () => {
      render(<AuthForgotPasswordScreen />);

      expect(screen.getByText("Forgot password")).toBeTruthy();
      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByText("Back")).toBeTruthy();
      expect(screen.getByText("Send reset link")).toBeTruthy();
      expect(screen.getByText("Return to login")).toBeTruthy();
      expect(
        screen.getByText(
          "Enter your email. If it exists, you will receive reset instructions.",
        ),
      ).toBeTruthy();
    });

    it("should load email from AuthRecoveryService.lastEmail", async () => {
      const testEmail = "test@example.com";
      (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(() => testEmail);

      render(<AuthForgotPasswordScreen />);

      await waitFor(() => {
        const input = screen.getByLabelText("Email");
        expect(input.props.value).toBe(testEmail);
      });
    });

    it("should load email from AsyncStorage when service has no email", async () => {
      const testEmail = "persisted@example.com";
      (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(() => "");
      await AsyncStorage.setItem(
        STORAGE_KEYS.FORM.FORGOT_PASSWORD,
        JSON.stringify({ email: testEmail }),
      );

      render(<AuthForgotPasswordScreen />);

      await waitFor(() => {
        const input = screen.getByLabelText("Email");
        expect(input.props.value).toBe(testEmail);
      });
    });

    it("should prefer service email over persisted email", async () => {
      const serviceEmail = "service@example.com";
      const persistedEmail = "persisted@example.com";

      (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(
        () => serviceEmail,
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.FORM.FORGOT_PASSWORD,
        JSON.stringify({ email: persistedEmail }),
      );

      render(<AuthForgotPasswordScreen />);

      await waitFor(() => {
        const input = screen.getByLabelText("Email");
        expect(input.props.value).toBe(serviceEmail);
      });
    });

    it("should handle mount errors gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (AuthRecoveryService.lastEmail as jest.Mock) = jest.fn(() => {
        throw new Error("Service error");
      });

      render(<AuthForgotPasswordScreen />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[AuthForgotPasswordScreen] mount failed:"),
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Form Persistence", () => {
    it("should persist email to AsyncStorage on change", async () => {
      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "new@example.com");

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.FORM.FORGOT_PASSWORD,
          JSON.stringify({ email: "new@example.com" }),
        );
      });
    });

    it("should handle persistence errors gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error"),
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "[AuthForgotPasswordScreen] persistEmail failed:",
          ),
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle corrupted persisted data", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await AsyncStorage.setItem(
        STORAGE_KEYS.FORM.FORGOT_PASSWORD,
        "invalid-json",
      );

      render(<AuthForgotPasswordScreen />);

      await waitFor(() => {
        expect(
          consoleErrorSpy.mock.calls.some(
            (args) =>
              typeof args[0] === "string" &&
              args[0].includes(
                "[AuthForgotPasswordScreen] loadPersistedEmail failed:",
              ),
          ),
        ).toBe(true);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Validation", () => {
    it("should show error when email is empty", async () => {
      render(<AuthForgotPasswordScreen />);

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.error).toHaveBeenCalledWith(
          "Request failed",
          "Email is required",
        );
      });

      expect(AuthRecoveryService.requestReset).not.toHaveBeenCalled();
    });

    it("should show error when email format is invalid", async () => {
      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "invalid-email");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.error).toHaveBeenCalledWith(
          "Request failed",
          "Enter a valid email",
        );
      });

      expect(AuthRecoveryService.requestReset).not.toHaveBeenCalled();
    });

    it("should accept valid email formats", async () => {
      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "valid@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AuthRecoveryService.requestReset).toHaveBeenCalledWith(
          "valid@example.com",
        );
      });
    });
  });

  describe("Submit - Success Flow", () => {
    it("should call AuthRecoveryService.requestReset with trimmed email", async () => {
      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "  test@example.com  ");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AuthRecoveryService.requestReset).toHaveBeenCalledWith(
          "test@example.com",
        );
      });
    });

    it("should save email to service on submission", async () => {
      render(<AuthForgotPasswordScreen />);

      const testEmail = "test@example.com";
      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, testEmail);

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AuthRecoveryService.setLastEmail).toHaveBeenCalledWith(
          testEmail,
        );
      });
    });

    it("should show success message and navigate to login on success", async () => {
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        ok: true,
        message: "Reset email sent",
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.success).toHaveBeenCalledWith(
          "Request received",
          "Reset email sent",
        );
      });

      expect(mockReplace).toHaveBeenCalledWith(NAV_ROUTES.AUTH.LOGIN);
    });

    it("should use default success message when not provided", async () => {
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.success).toHaveBeenCalledWith(
          "Request received",
          "If the email exists, you will receive reset instructions.",
        );
      });
    });

    it("should show loading state during submission", async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (AuthRecoveryService.requestReset as jest.Mock).mockReturnValueOnce(
        requestPromise,
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText("Sending…")).toBeTruthy();
      });

      // Resolve and check loading cleared
      resolveRequest!({ ok: true });
      await waitFor(() => {
        expect(screen.queryByText("Sending…")).toBeNull();
      });
    });

    it("should prevent multiple submissions while busy", async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (AuthRecoveryService.requestReset as jest.Mock).mockReturnValueOnce(
        requestPromise,
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");

      // First press
      fireEvent.press(submitBtn);

      // Second press (should be ignored)
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AuthRecoveryService.requestReset).toHaveBeenCalledTimes(1);
      });

      resolveRequest!({ ok: true });
    });
  });

  describe("Submit - Dev Token Flow", () => {
    it("should open modal when devResetToken is returned", async () => {
      const devToken = "dev-token-12345";
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        devResetToken: devToken,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dev reset token")).toBeTruthy();
        expect(screen.getByText(devToken)).toBeTruthy();
      });

      expect(AuthRecoveryService.setLastToken).toHaveBeenCalledWith(devToken);
    });

    it("should close modal when Close button is pressed", async () => {
      const devToken = "dev-token-12345";
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        devResetToken: devToken,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dev reset token")).toBeTruthy();
      });

      const closeBtn = screen.getByText("Close");
      fireEvent.press(closeBtn);

      await waitFor(() => {
        expect(screen.queryByText("Dev reset token")).toBeNull();
      });
    });

    it("should copy token to clipboard when Copy is pressed", async () => {
      const devToken = "dev-token-12345";
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        devResetToken: devToken,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dev reset token")).toBeTruthy();
      });

      const copyBtn = screen.getByLabelText("Copy");
      fireEvent.press(copyBtn);

      await waitFor(() => {
        expect(Clipboard.setString).toHaveBeenCalledWith(devToken);
      });

      // Modal should close after copy
      await waitFor(() => {
        expect(screen.queryByText("Dev reset token")).toBeNull();
      });
    });

    it("should navigate to reset screen when Go to reset is pressed", async () => {
      const devToken = "dev-token-12345";
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        devResetToken: devToken,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dev reset token")).toBeTruthy();
      });

      const goToResetBtn = screen.getByLabelText("Go to reset");
      fireEvent.press(goToResetBtn);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          NAV_ROUTES.AUTH.RESET_PASSWORD,
          {
            token: devToken,
          },
        );
      });
    });

    it("should handle clipboard copy errors gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const devToken = "dev-token-12345";
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        devResetToken: devToken,
      });
      (Clipboard.setString as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Clipboard error");
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Dev reset token")).toBeTruthy();
      });

      const copyBtn = screen.getByLabelText("Copy");
      fireEvent.press(copyBtn);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "[AuthForgotPasswordScreen] clipboard copy failed:",
          ),
          expect.any(Error),
        );
      });

      // Modal should still close
      await waitFor(() => {
        expect(screen.queryByText("Dev reset token")).toBeNull();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Submit - Error Flow", () => {
    it("should show error message when request fails", async () => {
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        ok: false,
        message: "Server error",
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.error).toHaveBeenCalledWith(
          "Request failed",
          "Server error",
        );
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should use default error message when not provided", async () => {
      (AuthRecoveryService.requestReset as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.error).toHaveBeenCalledWith(
          "Request failed",
          "Invalid request",
        );
      });
    });

    it("should handle exception during submit", async () => {
      (AuthRecoveryService.requestReset as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(AlertService.error).toHaveBeenCalledWith(
          "Request failed",
          expect.any(Error),
        );
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to login when Back button is pressed", () => {
      render(<AuthForgotPasswordScreen />);

      const backBtn = screen.getByText("Back");
      fireEvent.press(backBtn);

      expect(mockReplace).toHaveBeenCalledWith(NAV_ROUTES.AUTH.LOGIN);
    });

    it("should navigate to login when Return to login is pressed", () => {
      render(<AuthForgotPasswordScreen />);

      const returnBtn = screen.getByText("Return to login");
      fireEvent.press(returnBtn);

      expect(mockReplace).toHaveBeenCalledWith(NAV_ROUTES.AUTH.LOGIN);
    });

    it("should disable back button while busy", async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (AuthRecoveryService.requestReset as jest.Mock).mockReturnValueOnce(
        requestPromise,
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Sending…")).toBeTruthy();
      });

      const backBtn = screen.getByLabelText("Back to login");
      expect(backBtn.props.disabled).toBe(true);

      resolveRequest!({ ok: true });
    });

    it("should submit on Enter key press", async () => {
      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");
      fireEvent(input, "submitEditing");

      await waitFor(() => {
        expect(AuthRecoveryService.requestReset).toHaveBeenCalledWith(
          "test@example.com",
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper accessibility labels", () => {
      render(<AuthForgotPasswordScreen />);

      expect(screen.getByLabelText("Password recovery")).toBeTruthy();
      expect(screen.getByLabelText("Forgot password form")).toBeTruthy();
      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByLabelText("Send reset link")).toBeTruthy();
      expect(screen.getByLabelText("Back to login")).toBeTruthy();
      expect(screen.getByLabelText("Go to login")).toBeTruthy();
    });

    it("should disable input while busy", async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (AuthRecoveryService.requestReset as jest.Mock).mockReturnValueOnce(
        requestPromise,
      );

      render(<AuthForgotPasswordScreen />);

      const input = screen.getByLabelText("Email");
      fireEvent.changeText(input, "test@example.com");

      const submitBtn = screen.getByLabelText("Send reset link");
      fireEvent.press(submitBtn);

      await waitFor(() => {
        const emailInput = screen.getByLabelText("Email");
        expect(emailInput.props.editable).toBe(false);
      });

      resolveRequest!({ ok: true });
    });
  });
});
