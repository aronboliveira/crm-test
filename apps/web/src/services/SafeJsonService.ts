type JsonRecord = Record<string, unknown>;

export default class SafeJsonService {
  static isObject(value: unknown): value is JsonRecord {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

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
    return SafeJsonService.asObject(parsed, fallback);
  }

  static parseArray<T>(
    raw: string | null | undefined,
    fallback: T[] = [],
  ): T[] {
    const parsed = SafeJsonService.parse<unknown>(raw, fallback);
    return SafeJsonService.asArray<T>(parsed, fallback);
  }

  static asObject(value: unknown, fallback: JsonRecord = {}): JsonRecord {
    return SafeJsonService.isObject(value) ? value : fallback;
  }

  static asArray<T>(value: unknown, fallback: T[] = []): T[] {
    return Array.isArray(value) ? (value as T[]) : fallback;
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
