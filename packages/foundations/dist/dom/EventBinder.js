export default class EventBinder {
    static on(target, type, guardEl, guardAttr, cb, opts) {
        try {
            if (!target || !guardEl || !guardAttr || !cb)
                return;
            if (guardEl.hasAttribute(guardAttr))
                return;
            guardEl.setAttribute(guardAttr, "1");
            target.addEventListener(type, cb, opts);
        }
        catch (error) {
            console.warn(`[EventBinder] Error binding event "${type}":`, error);
        }
    }
    static onEl(el, type, guardAttr, cb, opts) {
        try {
            if (!el || !guardAttr || !cb)
                return;
            if (el.hasAttribute(guardAttr))
                return;
            el.setAttribute(guardAttr, "1");
            el.addEventListener(type, cb, opts);
        }
        catch (error) {
            console.warn(`[EventBinder] Error binding element event "${type}":`, error);
        }
    }
}
