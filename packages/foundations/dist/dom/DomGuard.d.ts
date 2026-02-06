export default class DomGuard {
    static attr(el: Element | null, name: string): boolean;
    static classOnce(el: Element | null, cls: string): void;
    static styleOnce(el: HTMLElement | null, prop: keyof CSSStyleDeclaration, value: string): void;
}
