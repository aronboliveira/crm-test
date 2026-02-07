import DateValidator from "./DateValidator";

export default class DateMapper {
  static fmtIso(
    iso: unknown,
    locale = undefined as string | undefined,
  ): string {
    const ms = DateValidator.ms(iso);
    if (!ms) return "-";

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ms));
  }
}
