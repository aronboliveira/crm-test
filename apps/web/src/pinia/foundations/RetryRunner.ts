export default class RetryRunner {
  #tries: number;
  #waitMs: number;

  constructor(tries: number, waitMs: number) {
    this.#tries = tries > 0 ? tries : 1;
    this.#waitMs = waitMs > 0 ? waitMs : 50;
  }

  async run<T>(fn: () => Promise<T>, ok: (v: T) => boolean): Promise<T | null> {
    if (!fn || typeof fn !== "function") {
      console.warn("[RetryRunner] Invalid function provided");
      return null;
    }

    for (let i = 0; i < this.#tries; i++) {
      try {
        const v = await fn();
        if (ok && ok(v)) return v;
        if (!ok) return v;
      } catch (error) {
        console.warn(
          `[RetryRunner] Attempt ${i + 1}/${this.#tries} failed:`,
          error,
        );
      }
      if (i < this.#tries - 1) {
        await RetryRunner.#sleep(this.#waitMs);
      }
    }
    console.warn(`[RetryRunner] All ${this.#tries} attempts exhausted`);
    return null;
  }

  static #sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
