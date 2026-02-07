export default class DateTimeService {
  static short(iso: unknown): string {
    const ms = iso && typeof iso === "string" ? new Date(iso).getTime() : null;
    if (!ms || isNaN(ms)) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms));
  }

  static shortWithTime(iso: unknown): string {
    const ms = iso && typeof iso === "string" ? new Date(iso).getTime() : null;
    if (!ms || isNaN(ms)) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  }
}
