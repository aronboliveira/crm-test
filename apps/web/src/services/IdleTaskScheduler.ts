type IdleTask = () => void;

const sanitizeDelay = (delayMs: number): number => {
  if (!Number.isFinite(delayMs)) {
    return 0;
  }
  return Math.max(0, Math.trunc(delayMs));
};

export default class IdleTaskScheduler {
  #timersByKey = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(key: string, delayMs: number, task: IdleTask): void {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return;
    }

    this.cancel(normalizedKey);
    const safeDelay = sanitizeDelay(delayMs);
    const timer = setTimeout(() => {
      this.#timersByKey.delete(normalizedKey);
      task();
    }, safeDelay);
    this.#timersByKey.set(normalizedKey, timer);
  }

  cancel(key: string): void {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return;
    }
    const timer = this.#timersByKey.get(normalizedKey);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.#timersByKey.delete(normalizedKey);
  }

  cancelAll(): void {
    for (const timer of this.#timersByKey.values()) {
      clearTimeout(timer);
    }
    this.#timersByKey.clear();
  }
}
