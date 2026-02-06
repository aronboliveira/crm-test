export default class DOMValidator {
  static ensureAttr(el: Element, k: string, v: string): void {
    el && el.getAttribute(k) !== v ? el.setAttribute(k, v) : void 0;
  }

  static ensureData(el: Element, key: string, v: string): void {
    const k = `data-${key}`;
    el && el.getAttribute(k) !== v ? el.setAttribute(k, v) : void 0;
  }

  static isData(el: Element, key: string, v: string): boolean {
    return el ? el.getAttribute(`data-${key}`) === v : false;
  }
}
