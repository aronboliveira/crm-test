import { describe, it, expect, vi, beforeEach } from "vitest";
import RetriableImport from "../src/bootstrap/RetriableImport";

describe("RetriableImport – extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject when loader is not a function", async () => {
    await expect(
      RetriableImport.load(null as any, { tries: 3, intervalMs: 10 }),
    ).rejects.toThrow("Loader must be a function");
  });

  it("should reject when retry policy is invalid", async () => {
    const loader = vi.fn().mockResolvedValue("ok");
    await expect(
      RetriableImport.load(loader, { tries: 0, intervalMs: 10 }),
    ).rejects.toThrow("Invalid retry policy");
  });

  it("should succeed with tries=1 on first success", async () => {
    const loader = vi.fn().mockResolvedValue("done");
    const result = await RetriableImport.load(loader, {
      tries: 1,
      intervalMs: 10,
    });
    expect(result).toBe("done");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("should not call onAttempt when first attempt succeeds", async () => {
    const loader = vi.fn().mockResolvedValue("ok");
    const onAttempt = vi.fn();
    await RetriableImport.load(loader, { tries: 3, intervalMs: 10 }, onAttempt);
    expect(onAttempt).not.toHaveBeenCalled();
  });

  it("should handle onAttempt callback errors gracefully", async () => {
    let calls = 0;
    const loader = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error("fail"));
      return Promise.resolve("ok");
    });
    const badCallback = vi.fn().mockImplementation(() => {
      throw new Error("callback boom");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await RetriableImport.load(
      loader,
      { tries: 3, intervalMs: 10 },
      badCallback,
    );
    expect(result).toBe("ok");
    warnSpy.mockRestore();
  });

  it("should wait between retries", async () => {
    let calls = 0;
    const loader = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error("wait"));
      return Promise.resolve("ok");
    });

    const start = Date.now();
    await RetriableImport.load(loader, { tries: 3, intervalMs: 50 });
    const elapsed = Date.now() - start;

    // Should have waited at least ~50ms (1 retry)
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
