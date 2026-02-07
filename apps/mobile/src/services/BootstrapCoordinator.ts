import { EventEmitter } from "events";
import PolicyService from "./PolicyService";
import AuthSessionService from "./AuthService";

type BootstrapReadyEvent = { ok: boolean };

export default class BootstrapCoordinator {
  static #READY = false;
  static #IN_FLIGHT: Promise<boolean> | null = null;

  static #TRIES = 14;
  static #WAIT_MS = 120;

  static #emitter = new EventEmitter();
  static #emitted = false;
  static #lastOk: boolean | null = null;

  /**
   * Equivalent to ensureReady() in the browser version.
   * - If already ready: resolves true immediately.
   * - If bootstrapping already running: waits for the same in-flight promise.
   * - Otherwise: runs bootstrap loop, caches result, emits once.
   */
  static async ensureReady(): Promise<boolean> {
    if (BootstrapCoordinator.#READY) return true;
    if (BootstrapCoordinator.#IN_FLIGHT) return BootstrapCoordinator.#IN_FLIGHT;

    BootstrapCoordinator.#IN_FLIGHT = (async () => {
      const ok = await BootstrapCoordinator.#runBootstrap();
      if (ok) BootstrapCoordinator.#READY = true;

      BootstrapCoordinator.#emitOnce(ok);
      return ok;
    })();

    try {
      return await BootstrapCoordinator.#IN_FLIGHT;
    } finally {
      BootstrapCoordinator.#IN_FLIGHT = null;
    }
  }

  /**
   * RN replacement for: document.addEventListener("app:bootstrap-ready", ...)
   *
   * - Returns an unsubscribe function.
   * - If bootstrap already emitted, calls handler immediately (async) with last result.
   */
  static onReady(handler: (evt: BootstrapReadyEvent) => void): () => void {
    const eventName = "app:bootstrap-ready";

    BootstrapCoordinator.#emitter.on(eventName, handler);

    if (
      BootstrapCoordinator.#emitted &&
      BootstrapCoordinator.#lastOk !== null
    ) {
      // fire on next tick to keep behavior consistent with event-based code
      setTimeout(
        () => handler({ ok: BootstrapCoordinator.#lastOk as boolean }),
        0,
      );
    }

    return () => {
      BootstrapCoordinator.#emitter.off(eventName, handler);
    };
  }

  static isReady(): boolean {
    return BootstrapCoordinator.#READY;
  }

  static reset(): void {
    // Optional helper for logout flows / dev hot reload
    BootstrapCoordinator.#READY = false;
    BootstrapCoordinator.#IN_FLIGHT = null;
    BootstrapCoordinator.#emitted = false;
    BootstrapCoordinator.#lastOk = null;
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
      // ignore
    }

    try {
      await PolicyService.bootstrap?.();
    } catch {
      // ignore
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

  static #emitOnce(ok: boolean): void {
    if (BootstrapCoordinator.#emitted) return;

    BootstrapCoordinator.#emitted = true;
    BootstrapCoordinator.#lastOk = ok;

    BootstrapCoordinator.#emitter.emit("app:bootstrap-ready", {
      ok,
    } satisfies BootstrapReadyEvent);
  }

  static #sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
