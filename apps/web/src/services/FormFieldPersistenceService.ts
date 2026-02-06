import DOMValidator from "./DOMValidator";

type StorageKind = "session" | "local";
type PersistMap = Record<string, Record<string, any>>;

export default class FormFieldPersistenceService {
  static #K = "_forms_persist_v2";
  static #FORM_BOUND = "data-ffps-bound";
  static #EL_BOUND = "data-ffps-el";

  static bind(
    form: HTMLFormElement,
    formId: string,
    storage: StorageKind = "session",
  ): void {
    if (!form) return;

    const fid = String(formId || "").trim();
    if (!fid) return;

    if (form.hasAttribute(FormFieldPersistenceService.#FORM_BOUND)) return;
    form.setAttribute(FormFieldPersistenceService.#FORM_BOUND, "1");

    const saved = FormFieldPersistenceService.#readAll(storage);
    const current =
      saved[fid] && typeof saved[fid] === "object" ? saved[fid] : {};

    const fields = Array.from(
      form.querySelectorAll("input,select,textarea"),
    ) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

    fields.forEach((el) => {
      const key = FormFieldPersistenceService.#keyOf(el);
      if (!key) return;

      FormFieldPersistenceService.#applySaved(el, current[key]);

      if (el.hasAttribute(FormFieldPersistenceService.#EL_BOUND)) return;
      el.setAttribute(FormFieldPersistenceService.#EL_BOUND, "1");

      const onChange = () => {
        const next = FormFieldPersistenceService.#readAll(storage);
        const bag = next[fid] && typeof next[fid] === "object" ? next[fid] : {};
        bag[key] = FormFieldPersistenceService.#valueOf(el);
        next[fid] = bag;
        FormFieldPersistenceService.#writeAll(storage, next);
      };

      el.addEventListener("input", onChange);
      el.addEventListener("change", onChange);

      DOMValidator.ensureAttr(el, "aria-describedby", `${fid}__help`);
    });
  }

  static clear(formId: string, storage: StorageKind = "session"): void {
    const fid = String(formId || "").trim();
    if (!fid) return;

    const all = FormFieldPersistenceService.#readAll(storage);
    all[fid]
      ? (delete all[fid], FormFieldPersistenceService.#writeAll(storage, all))
      : void 0;
  }

  static #applySaved(el: any, v: any): void {
    if (v === undefined || v === null) return;

    const tag = String(el?.tagName || "").toLowerCase();
    const type = tag === "input" ? String(el.type || "").toLowerCase() : "";

    if (tag === "input" && (type === "checkbox" || type === "radio")) {
      const wanted = v === true || v === "true" || v === 1 || v === "1";
      el.checked !== wanted ? (el.checked = wanted) : void 0;
      return;
    }

    const s = typeof v === "string" ? v : String(v);
    el.value !== s ? (el.value = s) : void 0;
  }

  static #keyOf(el: Element): string {
    const n = el.getAttribute("name");
    const id = el.getAttribute("id");
    const did = el.getAttribute("data-id");
    const k = (n || id || did || "").trim();
    return k;
  }

  static #valueOf(el: any): any {
    const tag = String(el?.tagName || "").toLowerCase();
    const type = tag === "input" ? String(el.type || "").toLowerCase() : "";

    if (tag === "input" && (type === "checkbox" || type === "radio"))
      return !!el.checked;
    return el.value;
  }

  static #readAll(storage: StorageKind): PersistMap {
    try {
      const store = storage === "local" ? localStorage : sessionStorage;
      const raw = store.getItem(FormFieldPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as PersistMap) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  static #writeAll(storage: StorageKind, obj: PersistMap): void {
    try {
      const store = storage === "local" ? localStorage : sessionStorage;
      store.setItem(FormFieldPersistenceService.#K, JSON.stringify(obj || {}));
    } catch {
      void 0;
    }
  }
}
