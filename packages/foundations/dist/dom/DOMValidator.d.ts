export default class DOMValidator {
    static isElement(v: unknown): v is Element;
    static ensureAttr(el: Element, name: string, value: string): boolean;
    static ensureFlag(el: Element, attr: string): boolean;
    static hasAttrValue(el: Element, name: string, value: string): boolean;
    static ensureData(el: Element, key: string, v: string): void;
    static isData(el: Element, key: string, v: string): boolean;
}
