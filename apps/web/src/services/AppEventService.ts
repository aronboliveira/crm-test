import { DOMValidator } from "@corp/foundations";

type EventKey = "projects:changed" | "tasks:changed";

export default class AppEventsService {
  static #ATTR_PREFIX = "data-app-event-";

  static emit(key: EventKey): void {
    window.dispatchEvent(new CustomEvent(key));
  }

  static on(key: EventKey, handler: () => void): () => void {
    const el = document.documentElement;
    const attr = `${AppEventsService.#ATTR_PREFIX}${key}`;

    const attach = () => window.addEventListener(key, handler as any);
    const detach = () => window.removeEventListener(key, handler as any);

    el && !el.hasAttribute(attr)
      ? (el.setAttribute(attr, "1"), attach())
      : attach();

    return () => detach();
  }

  static ensureOnceOnEl(el: HTMLElement, key: string): boolean {
    return DOMValidator.ensureFlag(
      el,
      `${AppEventsService.#ATTR_PREFIX}${key}`,
    );
  }
}
