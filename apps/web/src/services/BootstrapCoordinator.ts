import PolicyService from "./PolicyService";
import AuthSessionService from "./AuthService";

export default class BootstrapCoordinator {
  static #BOUND = "data-bc-bound";
  static #READY = "data-bc-ready";
  static #TRIES = 14;
  static #WAIT_MS = 120;

  static async ensureReady(): Promise<boolean> {
    const root = document.documentElement;
    if (!root) return false;

    if (root.getAttribute(BootstrapCoordinator.#READY) === "1") return true;
    if (root.hasAttribute(BootstrapCoordinator.#BOUND))
      return BootstrapCoordinator.#waitReady();

    root.setAttribute(BootstrapCoordinator.#BOUND, "1");

    const ok = await BootstrapCoordinator.#runBootstrap();
    ok ? root.setAttribute(BootstrapCoordinator.#READY, "1") : void 0;

    BootstrapCoordinator.#emitOnce(ok);
    return ok;
  }

  static async #runBootstrap(): Promise<boolean> {
    for (let i = 0; i < BootstrapCoordinator.#TRIES; i++) {
      const ok = await BootstrapCoordinator.#tick();
      if (ok) return true;
      await BootstrapCoordinator.#sleep(BootstrapCoordinator.#WAIT_MS);
    }
    return false;
  }

  static async #tick(): Promise<boolean> {
    try {
      await AuthSessionService.bootstrap?.();
    } catch {
      void 0;
    }

    try {
      await PolicyService.bootstrap?.();
    } catch {
      void 0;
    }

    const isAuthReady =
      typeof AuthSessionService.isReady === "function"
        ? !!AuthSessionService.isReady()
        : true;

    const isPolicyReady =
      typeof PolicyService.isReady === "function"
        ? !!PolicyService.isReady()
        : true;

    return isAuthReady && isPolicyReady;
  }

  static async #waitReady(): Promise<boolean> {
    const root = document.documentElement;
    for (let i = 0; i < BootstrapCoordinator.#TRIES; i++) {
      root && root.getAttribute(BootstrapCoordinator.#READY) === "1"
        ? true
        : void 0;
      if (root && root.getAttribute(BootstrapCoordinator.#READY) === "1")
        return true;
      await BootstrapCoordinator.#sleep(BootstrapCoordinator.#WAIT_MS);
    }
    return false;
  }

  static #emitOnce(ok: boolean): void {
    const root = document.documentElement;
    if (!root) return;

    const k = "data-bc-event";
    if (root.getAttribute(k) === "1") return;

    root.setAttribute(k, "1");
    document.dispatchEvent(
      new CustomEvent("app:bootstrap-ready", { detail: { ok } }),
    );
  }

  static #sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
