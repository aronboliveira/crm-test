export default class DateValidator {
  static #ISO =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+\-]\d{2}:\d{2})?)?$/;

  static isIso(v: unknown): v is string {
    return typeof v === "string" && DateValidator.#ISO.test(v.trim())
      ? true
      : false;
  }

  static parseIso(v: unknown): Date | null {
    if (!DateValidator.isIso(v)) return null;

    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  static normalizeIso(v: unknown): string | null {
    const d = DateValidator.parseIso(v);
    return d ? d.toISOString() : null;
  }

  static compareIso(a: unknown, b: unknown): number {
    const da = DateValidator.parseIso(a);
    const db = DateValidator.parseIso(b);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    const ta = da.getTime();
    const tb = db.getTime();
    return ta === tb ? 0 : ta < tb ? -1 : 1;
  }

  static ms(iso: unknown): number {
    return DateValidator.isIso(iso) ? Date.parse(iso) : 0;
  }
}
