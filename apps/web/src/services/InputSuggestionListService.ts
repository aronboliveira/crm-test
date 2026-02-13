interface InputSuggestionListConfig {
  minLength?: number;
  maxEntries?: number;
  maxSuggestions?: number;
}

const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_MAX_SUGGESTIONS = 5;

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

export default class InputSuggestionListService {
  #minLength: number;
  #maxEntries: number;
  #maxSuggestions: number;

  constructor(config: InputSuggestionListConfig = {}) {
    this.#minLength = toPositiveInt(config.minLength, DEFAULT_MIN_LENGTH);
    this.#maxEntries = toPositiveInt(config.maxEntries, DEFAULT_MAX_ENTRIES);
    this.#maxSuggestions = toPositiveInt(
      config.maxSuggestions,
      DEFAULT_MAX_SUGGESTIONS,
    );
  }

  get maxEntries(): number {
    return this.#maxEntries;
  }

  get maxSuggestions(): number {
    return this.#maxSuggestions;
  }

  sanitize(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim();
  }

  accepts(value: string): boolean {
    return this.sanitize(value).length >= this.#minLength;
  }

  clampSuggestionLimit(limit?: number): number {
    if (limit == null) {
      return this.#maxSuggestions;
    }
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) {
      return this.#maxSuggestions;
    }
    const normalized = Math.trunc(parsed);
    return Math.max(1, Math.min(this.#maxSuggestions, normalized));
  }

  normalizeEntries(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return [];
    }
    return this.mergeUnique(values, this.#maxEntries);
  }

  mergeUnique(values: Iterable<unknown>, limit = this.#maxEntries): string[] {
    const maxItems = Math.max(1, Math.min(this.#maxEntries, toPositiveInt(limit, 1)));
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const candidate of values) {
      const sanitized = this.sanitize(candidate);
      if (!this.accepts(sanitized)) {
        continue;
      }
      const dedupeKey = sanitized.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      merged.push(sanitized);
      if (merged.length >= maxItems) {
        break;
      }
    }

    return merged;
  }

  query(
    values: readonly string[],
    query: string,
    limit = this.#maxSuggestions,
  ): string[] {
    const sanitizedQuery = this.sanitize(query).toLowerCase();
    if (sanitizedQuery.length < this.#minLength) {
      return [];
    }

    const effectiveLimit = this.clampSuggestionLimit(limit);
    return this.normalizeEntries(values)
      .filter((entry) => entry.toLowerCase().includes(sanitizedQuery))
      .slice(0, effectiveLimit);
  }
}
