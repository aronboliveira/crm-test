export default class DateValidator {
  static isIso(v: unknown): v is string {
    const s = typeof v === "string" ? v : "";
    return s ? !Number.isNaN(Date.parse(s)) : false;
  }

  static ms(iso: unknown): number {
    return DateValidator.isIso(iso) ? Date.parse(iso) : 0;
  }
}
