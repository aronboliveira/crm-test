type BindOpts = AddEventListenerOptions | boolean;
export default class EventBinder {
    static on<K extends keyof WindowEventMap>(target: Window | null, type: K, guardEl: Element | null, guardAttr: string, cb: (ev: WindowEventMap[K]) => void, opts?: BindOpts): void;
    static onEl<K extends keyof HTMLElementEventMap>(el: HTMLElement | null, type: K, guardAttr: string, cb: (ev: HTMLElementEventMap[K]) => void, opts?: BindOpts): void;
}
export {};
