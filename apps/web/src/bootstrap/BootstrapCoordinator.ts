import { CompatibilityValidator, DomGuard } from "@corp/foundations";
import ThemeService from "../services/ThemeService";

type RetryPolicy = Readonly<{ tries: number; intervalMs: number }>;

export default class BootstrapCoordinator {
  static #DATASET_FLAG = "data-bootstrapped";
  static #EVT_READY = "app:ready";
  static #EVT_RETRY = "app:retry";

  static run(policy: RetryPolicy = { tries: 12, intervalMs: 120 }): void {
    try {
      const html = document.documentElement;
      if (!html) {
        console.error("[BootstrapCoordinator] Document root not found");
        return;
      }

      if (!DomGuard.attr(html, BootstrapCoordinator.#DATASET_FLAG)) return;

      const onReady = () => {
        try {
          ThemeService.bootstrap({
            preferWebkitTransitions: CompatibilityValidator.isWebkit(),
          });
          window.dispatchEvent(
            new CustomEvent(BootstrapCoordinator.#EVT_READY),
          );
        } catch (e) {
          console.error("[BootstrapCoordinator] Bootstrap failed:", e);
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onReady, { once: true });
      } else {
        onReady();
      }

      BootstrapCoordinator.#installRetry(policy);
    } catch (error) {
      console.error("[BootstrapCoordinator] Run failed:", error);
    }
  }

  static #installRetry(policy: RetryPolicy): void {
    let attempt = 0;

    const tick = () => {
      attempt >= policy.tries
        ? void 0
        : (attempt++,
          window.dispatchEvent(
            new CustomEvent(BootstrapCoordinator.#EVT_RETRY, {
              detail: { attempt },
            }),
          ));

      attempt < policy.tries
        ? window.setTimeout(tick, policy.intervalMs)
        : void 0;
    };

    window.setTimeout(tick, policy.intervalMs);
  }
}
