import { DateMapper } from "@corp/foundations";

export default class DateTimeService {
  static short(iso: unknown): string {
    return DateMapper.formatIso(iso, {
      locale: "ptBR",
      date: "short",
      time: null,
    });
  }

  static shortWithTime(iso: unknown): string {
    return DateMapper.formatIso(iso, {
      locale: "ptBR",
      date: "short",
      time: "short",
    });
  }
}
