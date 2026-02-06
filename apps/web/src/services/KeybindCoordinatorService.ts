type KeyCb = (ev: KeyboardEvent) => void;

export default class KeybindCoordinatorService {
  static #KEY = "data-kb-coordinator";
  static #bound = false;
  static #subs = new Set<KeyCb>();

  static bind(): void {
    const el = document.documentElement;
    if (!el) return;

    if (el.hasAttribute(KeybindCoordinatorService.#KEY)) return;
    el.setAttribute(KeybindCoordinatorService.#KEY, "1");

    if (KeybindCoordinatorService.#bound) return;
    KeybindCoordinatorService.#bound = true;

    window.addEventListener("keydown", (ev) => {
      KeybindCoordinatorService.#subs.forEach((fn) => {
        try {
          fn(ev);
        } catch {
          void 0;
        }
      });
    });
  }

  static on(fn: KeyCb): void {
    KeybindCoordinatorService.bind();
    KeybindCoordinatorService.#subs.add(fn);
  }

  static off(fn: KeyCb): void {
    KeybindCoordinatorService.#subs.delete(fn);
  }
}
