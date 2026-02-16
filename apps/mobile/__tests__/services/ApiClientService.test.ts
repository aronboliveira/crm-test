/**
 * ApiClientService Tests
 *
 * Comprehensive test suite for API client service.
 * Tests HTTP client initialization, interceptors, and API methods.
 */

import axios from "axios";

// Mock dependencies
jest.mock("axios");
jest.mock("../../src/services/AuthService");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-1234"),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

let ApiClientService: typeof import("../../src/services/ApiClientService").default;
let AuthService: typeof import("../../src/services/AuthService").default;
let authEvents: typeof import("../../src/services/AuthEvents").authEvents;

describe("ApiClientService", () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((onFulfilled, onRejected) => {
            // Store for testing
            (mockAxiosInstance as any)._requestInterceptor = {
              onFulfilled,
              onRejected,
            };
            return 0;
          }),
        },
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            // Store for testing
            (mockAxiosInstance as any)._responseInterceptor = {
              onFulfilled,
              onRejected,
            };
            return 0;
          }),
        },
      },
    };

    mockedAxios.create = jest.fn(() => mockAxiosInstance);

    jest.isolateModules(() => {
      ApiClientService = require("../../src/services/ApiClientService").default;
      AuthService = require("../../src/services/AuthService").default;
      authEvents = require("../../src/services/AuthEvents").authEvents;
    });
  });

  describe("initialization", () => {
    it("should create axios instance with correct config", () => {
      // The module is already imported, so axios.create was already called
      expect(mockedAxios.create).toHaveBeenCalled();

      const createCall = mockedAxios.create.mock.calls[0];
      expect(createCall[0]).toMatchObject({
        timeout: 10_000,
      });
    });

    it("should set up request interceptor", () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it("should set up response interceptor", () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe("request interceptor", () => {
    let requestInterceptor: any;

    beforeEach(() => {
      // Get the request interceptor
      requestInterceptor = (mockAxiosInstance as any)._requestInterceptor
        ?.onFulfilled;
    });

    it("should add X-Request-Id header", async () => {
      // Arrange
      const config = { headers: {} };

      // Act
      const result = await requestInterceptor(config);

      // Assert
      expect(result.headers["X-Request-Id"]).toBe("mock-uuid-1234");
    });

    it("should preserve existing X-Request-Id", async () => {
      // Arrange
      const config = {
        headers: { "X-Request-Id": "existing-id" },
      };

      // Act
      const result = await requestInterceptor(config);

      // Assert
      expect(result.headers["X-Request-Id"]).toBe("existing-id");
    });

    it("should add Authorization header when token exists", async () => {
      // Arrange
      const mockToken = "jwt-token-abc";
      (AuthService.token as jest.Mock).mockReturnValue(mockToken);
      const config = { headers: {} };

      // Act
      const result = await requestInterceptor(config);

      // Assert
      expect(result.headers["Authorization"]).toBe(`Bearer ${mockToken}`);
    });

    it("should not add Authorization if token missing", async () => {
      // Arrange
      (AuthService.token as jest.Mock).mockReturnValue(null);
      const config = { headers: {} };

      // Act
      const result = await requestInterceptor(config);

      // Assert
      expect(result.headers["Authorization"]).toBeUndefined();
    });

    it("should preserve existing Authorization header", async () => {
      // Arrange
      (AuthService.token as jest.Mock).mockReturnValue("jwt-token");
      const config = {
        headers: { Authorization: "Bearer custom-token" },
      };

      // Act
      const result = await requestInterceptor(config);

      // Assert
      expect(result.headers["Authorization"]).toBe("Bearer custom-token");
    });

    it("should handle interceptor errors gracefully", async () => {
      // Arrange
      (AuthService.token as jest.Mock).mockImplementation(() => {
        throw new Error("Auth error");
      });
      const config = { headers: {} };

      // Act
      const result = await requestInterceptor(config);

      // Assert - should still return config
      expect(result).toBeDefined();
      expect(result.headers).toBeDefined();
    });
  });

  describe("response interceptor", () => {
    let responseInterceptorError: any;

    beforeEach(() => {
      // Get the response error handler
      responseInterceptorError = (mockAxiosInstance as any)._responseInterceptor
        ?.onRejected;

      // Mock authEvents
      jest.spyOn(authEvents, "emit");
    });

    it("should emit expired event on 401 error", async () => {
      // Arrange
      const error = {
        response: { status: 401 },
        config: { url: "/api/some-protected-route" },
      };

      // Act & Assert
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      expect(authEvents.emit).toHaveBeenCalledWith("expired");
    });

    it("should not emit expired for login endpoint 401", async () => {
      // Arrange
      const error = {
        response: { status: 401 },
        config: { url: "/auth/login" },
      };

      // Act & Assert
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      expect(authEvents.emit).not.toHaveBeenCalled();
    });

    it("should log 5xx server errors", async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const error = {
        response: { status: 500 },
        config: { url: "/api/endpoint" },
      };

      // Act & Assert
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle errors without response", async () => {
      // Arrange
      const error = { message: "Network error" };

      // Act & Assert
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      // Should not throw during error handling
    });
  });

  describe("API methods - projects", () => {
    beforeEach(() => {
      // Reset ApiClientService.raw to use our mock
      (ApiClientService as any).raw = mockAxiosInstance;
    });

    it("should list projects", async () => {
      // Arrange
      const mockProjects = [
        { id: "1", name: "Project A" },
        { id: "2", name: "Project B" },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

      // Act
      const result = await ApiClientService.projects.list();

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/projects");
      expect(result).toEqual(mockProjects);
    });

    it("should get project options", async () => {
      // Arrange
      const mockOptions = [
        { value: "1", label: "Project A" },
        { value: "2", label: "Project B" },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockOptions });

      // Act
      const result = await ApiClientService.projects.options({ activeOnly: 1 });

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/projects/options", {
        params: { activeOnly: 1 },
      });
      expect(result).toEqual(mockOptions);
    });

    it("should create project", async () => {
      // Arrange
      const dto = { name: "New Project", description: "Test" };
      const mockCreated = { id: "1", ...dto };
      mockAxiosInstance.post.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await ApiClientService.projects.create(dto);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/projects", dto);
      expect(result).toEqual(mockCreated);
    });

    it("should update project", async () => {
      // Arrange
      const id = "project-123";
      const dto = { name: "Updated Name" };
      const mockUpdated = { id, ...dto };
      mockAxiosInstance.patch.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await ApiClientService.projects.update(id, dto);

      // Assert
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        `/projects/${id}`,
        dto,
      );
      expect(result).toEqual(mockUpdated);
    });

    it("should delete project", async () => {
      // Arrange
      const id = "project-123";
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });

      // Act
      const result = await ApiClientService.projects.remove(id);

      // Assert
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/projects/${id}`);
      expect(result).toEqual({ success: true });
    });

    it("should encode special characters in project ID", async () => {
      // Arrange
      const id = "project/with/slashes";
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      // Act
      await ApiClientService.projects.remove(id);

      // Assert
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/projects/project%2Fwith%2Fslashes",
      );
    });
  });

  describe("API methods - tasks", () => {
    beforeEach(() => {
      (ApiClientService as any).raw = mockAxiosInstance;
    });

    it("should list tasks", async () => {
      // Arrange
      const mockTasks = [
        { id: "1", title: "Task A" },
        { id: "2", title: "Task B" },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockTasks });

      // Act
      const result = await ApiClientService.tasks.list();

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/tasks");
      expect(result).toEqual(mockTasks);
    });

    it("should create task", async () => {
      // Arrange
      const dto = { title: "New Task", projectId: "project-1" };
      const mockCreated = { id: "1", ...dto };
      mockAxiosInstance.post.mockResolvedValue({ data: mockCreated });

      // Act
      const result = await ApiClientService.tasks.create(dto);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/tasks", dto);
      expect(result).toEqual(mockCreated);
    });

    it("should update task", async () => {
      // Arrange
      const id = "task-123";
      const dto = { title: "Updated Task" };
      const mockUpdated = { id, ...dto };
      mockAxiosInstance.patch.mockResolvedValue({ data: mockUpdated });

      // Act
      const result = await ApiClientService.tasks.update(id, dto);

      // Assert
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/tasks/${id}`, dto);
      expect(result).toEqual(mockUpdated);
    });

    it("should delete task", async () => {
      // Arrange
      const id = "task-123";
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });

      // Act
      const result = await ApiClientService.tasks.remove(id);

      // Assert
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/tasks/${id}`);
      expect(result).toEqual({ success: true });
    });
  });

  describe("API methods - auth", () => {
    beforeEach(() => {
      (ApiClientService as any).raw = mockAxiosInstance;
    });

    it("should fetch current user", async () => {
      // Arrange
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

      // Act
      const result = await ApiClientService.auth.me();

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/auth/me");
      expect(result).toEqual(mockUser);
    });
  });

  describe("raw axios access", () => {
    it("should expose raw axios instance", () => {
      expect(ApiClientService.raw).toBeDefined();
      expect(typeof ApiClientService.raw.get).toBe("function");
      expect(typeof ApiClientService.raw.post).toBe("function");
      expect(typeof ApiClientService.raw.patch).toBe("function");
      expect(typeof ApiClientService.raw.delete).toBe("function");
    });
  });

  describe("error scenarios", () => {
    beforeEach(() => {
      (ApiClientService as any).raw = mockAxiosInstance;
    });

    it("should propagate network errors", async () => {
      // Arrange
      const networkError = new Error("Network error");
      mockAxiosInstance.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ApiClientService.projects.list()).rejects.toThrow(
        "Network error",
      );
    });

    it("should propagate validation errors", async () => {
      // Arrange
      const validationError = {
        response: {
          status: 400,
          data: { message: "Validation failed" },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        ApiClientService.projects.create({ name: "" }),
      ).rejects.toEqual(validationError);
    });

    it("should handle timeout errors", async () => {
      // Arrange
      const timeoutError = {
        code: "ECONNABORTED",
        message: "timeout of 10000ms exceeded",
      };
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(ApiClientService.tasks.list()).rejects.toEqual(timeoutError);
    });
  });
});
