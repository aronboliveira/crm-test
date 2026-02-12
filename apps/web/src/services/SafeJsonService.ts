type JsonRecord = Record<string, unknown>;

export default class SafeJsonService {
  static parse<T>(raw: string | null | undefined, fallback: T): T {
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  static parseObject(
    raw: string | null | undefined,
    fallback: JsonRecord = {},
  ): JsonRecord {
    const parsed = SafeJsonService.parse<unknown>(raw, fallback);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as JsonRecord;
    }
    return fallback;
  }

  static tryStringify(value: unknown, space?: number): string | null {
    try {
      const serialized = JSON.stringify(value, null, space);
      return typeof serialized === "string" ? serialized : null;
    } catch {
      return null;
    }
  }

  static stringify(value: unknown, fallback = "{}", space?: number): string {
    const serialized = SafeJsonService.tryStringify(value, space);
    return serialized ?? fallback;
  }
}
