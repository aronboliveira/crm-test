export default class SafeJsonUtil {
  static parse<T>(raw: string, fallback: T): T {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  static parseObject(input: unknown): Record<string, unknown> | null {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return input as Record<string, unknown>;
    }
    if (typeof input !== 'string') {
      return null;
    }
    const parsed = SafeJsonUtil.parse<unknown>(input, null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  }

  static tryStringify(value: unknown): string | null {
    try {
      const serialized = JSON.stringify(value);
      return typeof serialized === 'string' ? serialized : null;
    } catch {
      return null;
    }
  }

  static stringify(value: unknown, fallback = '{}'): string {
    const serialized = SafeJsonUtil.tryStringify(value);
    return serialized ?? fallback;
  }

  static errorMessage(error: unknown): string {
    if (error instanceof Error && typeof error.message === 'string') {
      return error.message;
    }
    return SafeJsonUtil.stringify(error, '"Unknown error"');
  }
}
