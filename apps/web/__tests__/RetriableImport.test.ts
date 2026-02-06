import { describe, it, expect, vi, beforeEach } from "vitest";
import RetriableImport from "../src/bootstrap/RetriableImport";

describe("RetriableImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully load on first attempt", async () => {
    const mockLoader = vi.fn().mockResolvedValue("success");
    const policy = { tries: 3, intervalMs: 10 };

    const result = await RetriableImport.load(mockLoader, policy);

    expect(result).toBe("success");
    expect(mockLoader).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    let attempts = 0;
    const mockLoader = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error("loading failed"));
      }
      return Promise.resolve("success");
    });
    const policy = { tries: 5, intervalMs: 10 };

    const result = await RetriableImport.load(mockLoader, policy);

    expect(result).toBe("success");
    expect(mockLoader).toHaveBeenCalledTimes(3);
  });

  it("should throw after exhausting retries", async () => {
    const mockLoader = vi.fn().mockRejectedValue(new Error("always fails"));
    const policy = { tries: 3, intervalMs: 10 };

    await expect(RetriableImport.load(mockLoader, policy)).rejects.toThrow(
      "always fails",
    );
    expect(mockLoader).toHaveBeenCalledTimes(3);
  });

  it("should call onAttempt callback on each attempt", async () => {
    let attempts = 0;
    const mockLoader = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve("ok");
    });
    const onAttempt = vi.fn();
    const policy = { tries: 3, intervalMs: 10 };

    await RetriableImport.load(mockLoader, policy, onAttempt);

    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
