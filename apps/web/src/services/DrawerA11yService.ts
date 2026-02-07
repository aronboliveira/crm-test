import { DOMValidator } from "@corp/foundations";

export default class DrawerA11yService {
  static #ATTR = "data-drawer-a11y";
  static #panel: HTMLElement | null = null;
  static #lastActive: HTMLElement | null = null;

  static #onClose: (() => void) | null = null;

  static open(panel: HTMLElement, onClose: () => void): void {
    DrawerA11yService.#panel = panel;
    DrawerA11yService.#onClose = onClose;

    DrawerA11yService.#lastActive =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    DOMValidator.ensureAttr(panel, "tabindex", "-1");
    DOMValidator.ensureAttr(panel, "role", "dialog");
    DOMValidator.ensureAttr(panel, "aria-modal", "true");

    DOMValidator.ensureFlag(panel, DrawerA11yService.#ATTR)
      ? panel.addEventListener("keydown", DrawerA11yService.#onKeyDown as any)
      : void 0;

    DrawerA11yService.#focusFirst(panel);
  }

  static close(): void {
    const el = DrawerA11yService.#lastActive;
    DrawerA11yService.#panel = null;
    DrawerA11yService.#lastActive = null;
    DrawerA11yService.#onClose = null;
    el?.focus?.();
  }

  static #onKeyDown(ev: KeyboardEvent): void {
    if (!DrawerA11yService.#panel) return;

    ev.key === "Escape"
      ? (ev.preventDefault(), DrawerA11yService.#onClose?.())
      : void 0;
    ev.key === "Tab"
      ? DrawerA11yService.#trapTab(ev, DrawerA11yService.#panel)
      : void 0;
  }

  static #trapTab(ev: KeyboardEvent, panel: HTMLElement): void {
    const list = DrawerA11yService.#focusables(panel);
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;

    if (!first || !last) return;

    ev.shiftKey && active === first
      ? (ev.preventDefault(), last.focus())
      : void 0;
    !ev.shiftKey && active === last
      ? (ev.preventDefault(), first.focus())
      : void 0;
  }

  static #focusFirst(panel: HTMLElement): void {
    const list = DrawerA11yService.#focusables(panel);
    (list[0] ?? panel).focus?.();
  }

  static #focusables(root: HTMLElement): readonly HTMLElement[] {
    const sel = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    return Array.from(root.querySelectorAll(sel)).filter(
      (n) => n instanceof HTMLElement,
    ) as HTMLElement[];
  }
}
