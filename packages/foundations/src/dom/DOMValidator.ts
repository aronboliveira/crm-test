export default class DOMValidator {
  static isElement(v: unknown): v is Element {
    return v instanceof Element ? true : false;
  }

  static ensureAttr(el: Element, name: string, value: string): boolean {
    const cur = el.getAttribute(name);
    return cur === value ? false : (el.setAttribute(name, value), true);
  }

  static ensureFlag(el: Element, attr: string): boolean {
    return el.hasAttribute(attr) ? false : (el.setAttribute(attr, "1"), true);
  }

  static hasAttrValue(el: Element, name: string, value: string): boolean {
    return el.getAttribute(name) === value ? true : false;
  }

  static ensureData(el: Element, key: string, v: string): void {
    const k = `data-${key}`;
    el && el.getAttribute(k) !== v ? el.setAttribute(k, v) : void 0;
  }

  static isData(el: Element, key: string, v: string): boolean {
    return el ? el.getAttribute(`data-${key}`) === v : false;
  }
}
