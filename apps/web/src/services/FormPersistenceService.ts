import StorageService from "./StorageService";
import { DOMValidator } from "@corp/foundations";

type FormMap = Record<string, Record<string, string>>;

export default class FormPersistenceService {
  static #K = "ui.forms";
  static #ATTR = "data-form-persist";

  static read<T extends Record<string, any>>(formId: string, fallback: T): T {
    const k = String(formId || "").trim();
    if (!k) return fallback;

    try {
      const raw = sessionStorage.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      const v = obj && typeof obj === "object" ? obj[k] : null;

      return v && typeof v === "object"
        ? ({ ...fallback, ...v } as T)
        : fallback;
    } catch {
      return fallback;
    }
  }

  static write(formId: string, data: Record<string, any>): void {
    const k = String(formId || "").trim();
    if (!k) return;

    try {
      const raw = sessionStorage.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      const next = { ...(obj || {}), [k]: { ...(data || {}) } };
      sessionStorage.setItem(FormPersistenceService.#K, JSON.stringify(next));
    } catch {
      void 0;
    }
  }

  static clear(formId: string): void {
    const k = String(formId || "").trim();
    if (!k) return;

    try {
      const raw = sessionStorage.getItem(FormPersistenceService.#K);
      const obj = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      obj && typeof obj === "object" && obj[k]
        ? (delete obj[k],
          sessionStorage.setItem(
            FormPersistenceService.#K,
            JSON.stringify(obj),
          ))
        : void 0;
    } catch {
      void 0;
    }
  }

  static load(formId: string): Record<string, string> {
    const all = StorageService.local.getJson<FormMap>(
      FormPersistenceService.#K,
      {},
    );
    const row = all[formId];
    return row && typeof row === "object" ? row : {};
  }

  static save(formId: string, data: Record<string, string>): void {
    const all = StorageService.local.getJson<FormMap>(
      FormPersistenceService.#K,
      {},
    );
    all[formId] = data;
    StorageService.local.setJson(FormPersistenceService.#K, all);
  }

  static bind(form: HTMLFormElement, formId: string): void {
    if (!form || !DOMValidator.ensureFlag(form, FormPersistenceService.#ATTR))
      return;

    const apply = () => {
      const saved = FormPersistenceService.load(formId);
      Array.from(form.elements).forEach((el: any) => {
        if (!(el instanceof HTMLElement)) return;

        const key = FormPersistenceService.#keyOf(el);
        if (!key) return;

        const v = saved[key];
        v != null &&
        "value" in el &&
        typeof (el as any).value === "string" &&
        (el as any).value !== v
          ? ((el as any).value = v)
          : void 0;
      });
    };

    const store = () => {
      const out: Record<string, string> = {};
      Array.from(form.elements).forEach((el: any) => {
        if (!(el instanceof HTMLElement)) return;

        const key = FormPersistenceService.#keyOf(el);
        if (!key) return;

        "value" in el && typeof (el as any).value === "string"
          ? (out[key] = (el as any).value)
          : void 0;
      });

      FormPersistenceService.save(formId, out);
    };

    apply();
    form.addEventListener("input", store as any);
    form.addEventListener("change", store as any);
  }

  /** Alias for {@link write} — used by form components */
  static persist(formId: string, data: Record<string, any>): void {
    FormPersistenceService.write(formId, data);
  }

  /** Alias for {@link read} — used by form components */
  static restore<T extends Record<string, any>>(
    formId: string,
    fallback: T = {} as T,
  ): T {
    return FormPersistenceService.read(formId, fallback);
  }

  static #keyOf(el: HTMLElement): string {
    const did = el.getAttribute("data-id");
    const nm = (el as any).name;
    const id = (el as any).id;

    return typeof did === "string" && did.trim()
      ? did.trim()
      : typeof nm === "string" && nm.trim()
        ? nm.trim()
        : typeof id === "string" && id.trim()
          ? id.trim()
          : "";
  }
}
