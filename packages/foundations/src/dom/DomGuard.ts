export default class DomGuard {
  static attr(el: Element | null, name: string): boolean {
    try {
      if (!el) return false;
      if (el.hasAttribute(name)) return false;
      el.setAttribute(name, "1");
      return true;
    } catch (error) {
      console.warn(`[DomGuard] Error setting attribute "${name}":`, error);
      return false;
    }
  }

  static classOnce(el: Element | null, cls: string): void {
    try {
      if (!el || !cls) return;
      if (!el.classList.contains(cls)) {
        el.classList.add(cls);
      }
    } catch (error) {
      console.warn(`[DomGuard] Error adding class "${cls}":`, error);
    }
  }

  static styleOnce(
    el: HTMLElement | null,
    prop: keyof CSSStyleDeclaration,
    value: string,
  ): void {
    try {
      if (!el || !prop || value === undefined) return;
      const style = el.style as unknown as Record<string, string>;
      const cur = style[prop as string];
      if (cur !== value) {
        style[prop as string] = value;
      }
    } catch (error) {
      console.warn(`[DomGuard] Error setting style "${String(prop)}":`, error);
    }
  }
}
