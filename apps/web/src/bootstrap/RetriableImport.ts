type RetryPolicy = Readonly<{ tries: number; intervalMs: number }>;

export default class RetriableImport {
  static async load<T>(
    loader: () => Promise<T>,
    policy: RetryPolicy,
    onAttempt?: (attempt: number, err: unknown) => void,
  ): Promise<T> {
    if (!loader || typeof loader !== "function") {
      throw new Error("[RetriableImport] Loader must be a function");
    }

    if (!policy || policy.tries < 1) {
      throw new Error("[RetriableImport] Invalid retry policy");
    }

    let attempt = 0;

    while (attempt < policy.tries) {
      attempt++;
      try {
        return await loader();
      } catch (e) {
        if (onAttempt) {
          try {
            onAttempt(attempt, e);
          } catch (cbError) {
            console.warn(
              "[RetriableImport] onAttempt callback error:",
              cbError,
            );
          }
        }

        if (attempt >= policy.tries) {
          console.error(
            `[RetriableImport] All ${policy.tries} attempts failed:`,
            e,
          );
          throw e;
        }

        await RetriableImport.#sleep(policy.intervalMs);
      }
    }

    throw new Error("[RetriableImport] Unreachable code");
  }

  static #sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
