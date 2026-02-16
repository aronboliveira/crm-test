import { EventEmitter } from "events";

export type EventKey = "projects:changed" | "tasks:changed";

/**
 * RN replacement for window/document events + DOM flags.
 *
 * Usage:
 *  const off = AppEventsService.on("projects:changed", () => reload());
 *  return () => off();
 *
 *  AppEventsService.emit("projects:changed");
 */
export default class AppEventsService {
  static #emitter = (() => {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(50);
    return emitter;
  })();

  static emit(key: EventKey): void {
    AppEventsService.#emitter.emit(key);
  }

  static on(key: EventKey, handler: () => void): () => void {
    AppEventsService.#emitter.on(key, handler);
    return () => {
      AppEventsService.#emitter.off(key, handler);
    };
  }

  /**
   * Replacement for ensureOnceOnEl(el, key).
   * RN has no DOM element to stamp flags on, so we scope this to the app process.
   *
   * Returns true the FIRST time a given key is requested, then false.
   */
  static #onceFlags = new Set<string>();

  static ensureOnceOnKey(key: string): boolean {
    const k = `data-app-event-${key}`;
    if (AppEventsService.#onceFlags.has(k)) return false;
    AppEventsService.#onceFlags.add(k);
    return true;
  }

  /**
   * Optional: allow resetting flags during dev hot reload or tests.
   */
  static resetOnceFlags(): void {
    AppEventsService.#onceFlags.clear();
  }
}
