import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IdleTaskScheduler from "../src/services/IdleTaskScheduler";

describe("IdleTaskScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes scheduled task after delay", () => {
    const scheduler = new IdleTaskScheduler();
    const spy = vi.fn();

    scheduler.schedule("devices", 5000, spy);
    vi.advanceTimersByTime(4999);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("resets timer when scheduling the same key again", () => {
    const scheduler = new IdleTaskScheduler();
    const spy = vi.fn();

    scheduler.schedule("devices", 5000, spy);
    vi.advanceTimersByTime(2000);
    scheduler.schedule("devices", 5000, spy);

    vi.advanceTimersByTime(3000);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("cancels all pending tasks", () => {
    const scheduler = new IdleTaskScheduler();
    const spy = vi.fn();

    scheduler.schedule("devices", 1000, spy);
    scheduler.schedule("audit", 1000, spy);
    scheduler.cancelAll();

    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});
