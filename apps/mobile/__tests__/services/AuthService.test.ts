/**
 * AuthService Tests
 *
 * Comprehensive test suite for authentication service.
 * Tests token management, user session, login/logout flows.
 */

import AuthService from "../../src/services/AuthService";
import StorageService from "../../src/services/StorageService";
import ApiClientService from "../../src/services/ApiClientService";
import { STORAGE_KEYS } from "../../src/constants";

// Mock dependencies
jest.mock("../../src/services/StorageService");
jest.mock("../../src/services/ApiClientService");

describe("AuthService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset service state
    (AuthService as any)._ready = false;
  });

  describe("bootstrap", () => {
    it("should mark as ready when token and user exist", async () => {
      // Arrange
      const mockToken = "test-jwt-token";
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
      };

      (StorageService.session.getStr as jest.Mock).mockReturnValue(mockToken);
      (StorageService.session.getJson as jest.Mock).mockReturnValue(mockUser);

      // Act
      await AuthService.bootstrap();

      // Assert
      expect(AuthService.isReady()).toBe(true);
    });

    it("should mark as not ready when token is missing", async () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockReturnValue("");
      (StorageService.session.getJson as jest.Mock).mockReturnValue(null);

      // Act
      await AuthService.bootstrap();

      // Assert
      expect(AuthService.isReady()).toBe(false);
    });

    it("should handle bootstrap errors gracefully", async () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      await AuthService.bootstrap();

      // Assert
      expect(AuthService.isReady()).toBe(false);
    });
  });

  describe("token", () => {
    it("should return token when present", () => {
      // Arrange
      const mockToken = "test-jwt-token";
      (StorageService.session.getStr as jest.Mock).mockReturnValue(mockToken);

      // Act
      const result = AuthService.token();

      // Assert
      expect(result).toBe(mockToken);
      expect(StorageService.session.getStr).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.TOKEN,
        "",
      );
    });

    it("should return null when token is empty", () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockReturnValue("");

      // Act
      const result = AuthService.token();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null on error", () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      const result = AuthService.token();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("isAuthed", () => {
    it("should return true when token exists", () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockReturnValue(
        "valid-token",
      );

      // Act
      const result = AuthService.isAuthed();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when token is missing", () => {
      // Arrange
      (StorageService.session.getStr as jest.Mock).mockReturnValue("");

      // Act
      const result = AuthService.isAuthed();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("me", () => {
    it("should return user session when present", () => {
      // Arrange
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      };
      (StorageService.session.getJson as jest.Mock).mockReturnValue(mockUser);

      // Act
      const result = AuthService.me();

      // Assert
      expect(result).toEqual(mockUser);
      expect(StorageService.session.getJson).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.USER,
        null,
      );
    });

    it("should return null when user not found", () => {
      // Arrange
      (StorageService.session.getJson as jest.Mock).mockReturnValue(null);

      // Act
      const result = AuthService.me();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null on error", () => {
      // Arrange
      (StorageService.session.getJson as jest.Mock).mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      const result = AuthService.me();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "SecurePass123!";
      const mockResponse = {
        data: {
          accessToken: "jwt-token-123",
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
          },
        },
      };

      (ApiClientService.raw.post as jest.Mock).mockResolvedValue(mockResponse);
      (StorageService.session.setStr as jest.Mock).mockImplementation(() => {});
      (StorageService.session.setJson as jest.Mock).mockImplementation(
        () => {},
      );

      // Act
      await AuthService.login(email, password);

      // Assert
      expect(ApiClientService.raw.post).toHaveBeenCalledWith(
        "/auth/login",
        expect.objectContaining({
          email: "test@example.com",
          password: "SecurePass123!",
        }),
      );
      expect(StorageService.session.setStr).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.TOKEN,
        "jwt-token-123",
      );
      expect(StorageService.session.setJson).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.USER,
        mockResponse.data.user,
      );
    });

    it("should throw error when email is missing", async () => {
      // Act & Assert
      await expect(AuthService.login("", "password")).rejects.toThrow(
        "Email is required",
      );
    });

    it("should throw error when password is missing", async () => {
      // Act & Assert
      await expect(AuthService.login("test@example.com", "")).rejects.toThrow(
        "Password is required",
      );
    });

    it("should throw error when token not received", async () => {
      // Arrange
      const mockResponse = { data: {} };
      (ApiClientService.raw.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        AuthService.login("test@example.com", "password"),
      ).rejects.toThrow("No access token received from server");
    });

    it("should clear storage on login failure", async () => {
      // Arrange
      (ApiClientService.raw.post as jest.Mock).mockRejectedValue(
        new Error("Invalid credentials"),
      );
      (StorageService.session.del as jest.Mock).mockImplementation(() => {});

      // Act & Assert
      await expect(
        AuthService.login("test@example.com", "wrong-password"),
      ).rejects.toThrow("Invalid credentials");

      expect(StorageService.session.del).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.TOKEN,
      );
      expect(StorageService.session.del).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.USER,
      );
    });

    it("should trim and lowercase email", async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: "token",
          user: { id: "1", email: "test@example.com" },
        },
      };
      (ApiClientService.raw.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await AuthService.login("  TEST@EXAMPLE.COM  ", "password");

      // Assert
      expect(ApiClientService.raw.post).toHaveBeenCalledWith(
        "/auth/login",
        expect.objectContaining({
          email: "test@example.com",
          password: "password",
        }),
      );
    });

    it("should delete user data if not received in response", async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: "token",
          // No user data
        },
      };
      (ApiClientService.raw.post as jest.Mock).mockResolvedValue(mockResponse);
      (StorageService.session.del as jest.Mock).mockImplementation(() => {});

      // Act
      await AuthService.login("test@example.com", "password");

      // Assert
      expect(StorageService.session.del).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.USER,
      );
    });

    it("should return two-factor challenge response without storing token", async () => {
      (ApiClientService.raw.post as jest.Mock).mockResolvedValue({
        data: {
          requiresTwoFactor: true,
          twoFactorToken: "tf-token",
          email: "test@example.com",
        },
      });

      const result = await AuthService.login("test@example.com", "password");

      expect((result as any).requiresTwoFactor).toBe(true);
      expect(StorageService.session.setStr).not.toHaveBeenCalled();
    });
  });

  describe("verifyTwoFactor", () => {
    it("stores token and user when verification succeeds", async () => {
      (ApiClientService.raw.post as jest.Mock).mockResolvedValue({
        data: {
          accessToken: "jwt-2fa",
          user: { id: "1", email: "test@example.com" },
        },
      });

      await AuthService.verifyTwoFactor("tf-token", "123456");

      expect(ApiClientService.raw.post).toHaveBeenCalledWith(
        "/auth/verify-2fa",
        {
          twoFactorToken: "tf-token",
          code: "123456",
        },
      );
      expect(StorageService.session.setStr).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.TOKEN,
        "jwt-2fa",
      );
    });

    it("throws when token is missing", async () => {
      await expect(AuthService.verifyTwoFactor("", "123456")).rejects.toThrow(
        "Two-factor token is required",
      );
    });
  });

  describe("logout", () => {
    it("should clear token and user data", () => {
      // Arrange
      (StorageService.session.del as jest.Mock).mockImplementation(() => {});

      // Act
      AuthService.logout();

      // Assert
      expect(StorageService.session.del).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.TOKEN,
      );
      expect(StorageService.session.del).toHaveBeenCalledWith(
        STORAGE_KEYS.AUTH.USER,
      );
    });

    it("should handle logout errors gracefully", () => {
      // Arrange
      (StorageService.session.del as jest.Mock).mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act & Assert - should not throw
      expect(() => AuthService.logout()).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete login flow", async () => {
      // Arrange
      const credentials = {
        email: "user@example.com",
        password: "SecurePass123!",
      };
      const mockResponse = {
        data: {
          accessToken: "jwt-abc-123",
          user: {
            id: "user-1",
            email: "user@example.com",
            name: "John Doe",
            role: "user",
          },
        },
      };

      (ApiClientService.raw.post as jest.Mock).mockResolvedValue(mockResponse);
      (StorageService.session.setStr as jest.Mock).mockImplementation(() => {});
      (StorageService.session.setJson as jest.Mock).mockImplementation(
        () => {},
      );
      (StorageService.session.getStr as jest.Mock).mockReturnValue(
        "jwt-abc-123",
      );
      (StorageService.session.getJson as jest.Mock).mockReturnValue(
        mockResponse.data.user,
      );

      // Act
      await AuthService.login(credentials.email, credentials.password);
      await AuthService.bootstrap();

      // Assert
      expect(AuthService.isReady()).toBe(true);
      expect(AuthService.isAuthed()).toBe(true);
      expect(AuthService.token()).toBe("jwt-abc-123");
      expect(AuthService.me()).toEqual(mockResponse.data.user);
    });

    it("should handle complete logout flow", () => {
      // Arrange
      (StorageService.session.del as jest.Mock).mockImplementation(() => {});
      (StorageService.session.getStr as jest.Mock).mockReturnValue("");
      (StorageService.session.getJson as jest.Mock).mockReturnValue(null);

      // Act
      AuthService.logout();

      // Assert
      expect(AuthService.isAuthed()).toBe(false);
      expect(AuthService.token()).toBeNull();
      expect(AuthService.me()).toBeNull();
    });
  });
});
