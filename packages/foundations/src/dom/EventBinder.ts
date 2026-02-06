type BindOpts = AddEventListenerOptions | boolean;

export default class EventBinder {
  static on<K extends keyof WindowEventMap>(
    target: Window | null,
    type: K,
    guardEl: Element | null,
    guardAttr: string,
    cb: (ev: WindowEventMap[K]) => void,
    opts?: BindOpts,
  ): void {
    try {
      if (!target || !guardEl || !guardAttr || !cb) return;
      if (guardEl.hasAttribute(guardAttr)) return;

      guardEl.setAttribute(guardAttr, "1");
      target.addEventListener(type, cb as EventListener, opts);
    } catch (error) {
      console.warn(`[EventBinder] Error binding event "${type}":`, error);
    }
  }

  static onEl<K extends keyof HTMLElementEventMap>(
    el: HTMLElement | null,
    type: K,
    guardAttr: string,
    cb: (ev: HTMLElementEventMap[K]) => void,
    opts?: BindOpts,
  ): void {
    try {
      if (!el || !guardAttr || !cb) return;
      if (el.hasAttribute(guardAttr)) return;

      el.setAttribute(guardAttr, "1");
      el.addEventListener(type, cb as EventListener, opts);
    } catch (error) {
      console.warn(
        `[EventBinder] Error binding element event "${type}":`,
        error,
      );
    }
  }
}
