import IdleTaskScheduler from "./IdleTaskScheduler";
import InputSuggestionListService from "./InputSuggestionListService";
import SafeJsonService from "./SafeJsonService";
import type { StorageKeyValueStore } from "./StorageService";

/**
 * SmartAutocompleteService
 *
 * Keeps local suggestion history for a single input key.
 * Persistence criteria:
 *  1. 5-second idle typing (`commit`)
 *  2. explicit submit (`commitSubmitted`)
 */

const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_MAX_SUGGESTIONS = 5;
const DEFAULT_PERSIST_DELAY_MS = 5_000;
const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_STORAGE_PREFIX = "_ac_";

interface SmartAutocompleteConfig {
  maxEntries?: number;
  maxSuggestions?: number;
  minLength?: number;
  persistDelayMs?: number;
  storagePrefix?: string;
  storage?: StorageKeyValueStore | null;
}

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const resolveStorage = (
  candidate: StorageKeyValueStore | null | undefined,
): StorageKeyValueStore | null => {
  if (candidate) {
    return candidate;
  }
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    void 0;
  }
  return null;
};

export default class SmartAutocompleteService {
  #field: string;
  #storage: StorageKeyValueStore | null;
  #storagePrefix: string;
  #persistDelayMs: number;
  #policy: InputSuggestionListService;
  #scheduler = new IdleTaskScheduler();

  constructor(field: string, config: SmartAutocompleteConfig = {}) {
    this.#field = String(field || "").trim();
    this.#storagePrefix = config.storagePrefix ?? DEFAULT_STORAGE_PREFIX;
    this.#persistDelayMs = toPositiveInt(
      config.persistDelayMs,
      DEFAULT_PERSIST_DELAY_MS,
    );
    this.#storage = resolveStorage(config.storage);
    this.#policy = new InputSuggestionListService({
      minLength: config.minLength ?? DEFAULT_MIN_LENGTH,
      maxEntries: config.maxEntries ?? DEFAULT_MAX_ENTRIES,
      maxSuggestions: config.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS,
    });
  }

  suggest(prefix: string, limit = this.#policy.maxSuggestions): string[] {
    const entries = this.#readEntries();
    return this.#policy.query(entries, prefix, limit);
  }

  commit(value: string): void {
    const sanitized = this.#policy.sanitize(value);
    if (!this.#policy.accepts(sanitized)) {
      this.cancel();
      return;
    }

    this.#scheduler.schedule(this.#field, this.#persistDelayMs, () => {
      this.#persistNow(sanitized);
    });
  }

  commitSubmitted(value: string): void {
    this.#persistNow(value);
  }

  cancel(): void {
    this.#scheduler.cancel(this.#field);
  }

  clear(): void {
    this.cancel();
    try {
      this.#storage?.removeItem(this.#storageKey());
    } catch {
      void 0;
    }
  }

  #storageKey(): string {
    return `${this.#storagePrefix}${this.#field}`;
  }

  #readEntries(): string[] {
    if (!this.#storage || !this.#field) {
      return [];
    }
    try {
      const raw = this.#storage.getItem(this.#storageKey());
      const parsed = SafeJsonService.parseArray<unknown>(raw, []);
      return this.#policy.normalizeEntries(parsed);
    } catch {
      return [];
    }
  }

  #persistNow(value: string): void {
    const sanitized = this.#policy.sanitize(value);
    if (!this.#policy.accepts(sanitized)) {
      return;
    }

    const nextEntries = this.#policy.mergeUnique([
      sanitized,
      ...this.#readEntries(),
    ]);
    this.#writeEntries(nextEntries);
  }

  #writeEntries(entries: readonly string[]): void {
    if (!this.#storage || !this.#field) {
      return;
    }
    try {
      const payload = this.#policy.mergeUnique(entries, this.#policy.maxEntries);
      const serialized = SafeJsonService.tryStringify(payload);
      if (!serialized) {
        return;
      }
      this.#storage.setItem(this.#storageKey(), serialized);
    } catch {
      void 0;
    }
  }
}
