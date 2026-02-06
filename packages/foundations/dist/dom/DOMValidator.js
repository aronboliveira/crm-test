export default class DOMValidator {
    static isElement(v) {
        return v instanceof Element ? true : false;
    }
    static ensureAttr(el, name, value) {
        const cur = el.getAttribute(name);
        return cur === value ? false : (el.setAttribute(name, value), true);
    }
    static ensureFlag(el, attr) {
        return el.hasAttribute(attr) ? false : (el.setAttribute(attr, "1"), true);
    }
    static hasAttrValue(el, name, value) {
        return el.getAttribute(name) === value ? true : false;
    }
    static ensureData(el, key, v) {
        const k = `data-${key}`;
        el && el.getAttribute(k) !== v ? el.setAttribute(k, v) : void 0;
    }
    static isData(el, key, v) {
        return el ? el.getAttribute(`data-${key}`) === v : false;
    }
}
