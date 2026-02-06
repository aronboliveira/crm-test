import type { Router } from "vue-router";
import { DOMValidator } from "@corp/foundations";
import AuthService from "../services/AuthService";

export default class AppBootstrap {
  static #ATTR = "data-app-boot";

  static init(router: Router): void {
    try {
      const root = document.documentElement;
      if (!root) {
        console.warn("[AppBootstrap] Document root not found");
        return;
      }

      if (DOMValidator.ensureFlag(root, AppBootstrap.#ATTR)) {
        AppBootstrap.#wireAuthExpired(router);
      }

      window.dispatchEvent(new CustomEvent("app:bootstrapped"));
    } catch (error) {
      console.error("[AppBootstrap] Initialization failed:", error);
    }
  }

  static #wireAuthExpired(router: Router): void {
    try {
      window.addEventListener("auth:expired", async () => {
        try {
          AuthService.logout();
          await router.replace("/login");
        } catch (error) {
          console.error(
            "[AppBootstrap] Failed to handle auth expiration:",
            error,
          );
        }
      });
    } catch (error) {
      console.error(
        "[AppBootstrap] Failed to wire auth expired handler:",
        error,
      );
    }
  }
}
