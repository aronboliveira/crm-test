export default class DomGuard {
    static attr(el, name) {
        try {
            if (!el)
                return false;
            if (el.hasAttribute(name))
                return false;
            el.setAttribute(name, "1");
            return true;
        }
        catch (error) {
            console.warn(`[DomGuard] Error setting attribute "${name}":`, error);
            return false;
        }
    }
    static classOnce(el, cls) {
        try {
            if (!el || !cls)
                return;
            if (!el.classList.contains(cls)) {
                el.classList.add(cls);
            }
        }
        catch (error) {
            console.warn(`[DomGuard] Error adding class "${cls}":`, error);
        }
    }
    static styleOnce(el, prop, value) {
        try {
            if (!el || !prop || value === undefined)
                return;
            const style = el.style;
            const cur = style[prop];
            if (cur !== value) {
                style[prop] = value;
            }
        }
        catch (error) {
            console.warn(`[DomGuard] Error setting style "${String(prop)}":`, error);
        }
    }
}
