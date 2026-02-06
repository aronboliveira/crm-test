import { EventBinder } from "@corp/foundations";

type OpenOpts = Readonly<{ onClose: () => void }>;

export default class FocusableDialogService {
  static #ATTR = "data-dialog-wired";
  static #lastActive: HTMLElement | null = null;

  static open(root: HTMLElement, opts: OpenOpts): void {
    if (!root || root.hasAttribute(FocusableDialogService.#ATTR)) return;

    root.setAttribute(FocusableDialogService.#ATTR, "1");
    FocusableDialogService.#lastActive =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = FocusableDialogService.#focusables(root);
    (focusables[0] ?? root).focus?.();

    EventBinder.onEl(root, "keydown", "data-kb-guard", (ev: KeyboardEvent) => {
      if (ev.key === "Escape") return (ev.preventDefault(), opts.onClose());

      if (ev.key !== "Tab") return;

      const list = FocusableDialogService.#focusables(root);
      if (!list.length) return;

      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;

      if (ev.shiftKey && active === first)
        return (ev.preventDefault(), last?.focus());
      if (!ev.shiftKey && active === last)
        return (ev.preventDefault(), first?.focus());
    });
  }

  static close(): void {
    const el = FocusableDialogService.#lastActive;
    FocusableDialogService.#lastActive = null;
    el?.focus?.();
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
