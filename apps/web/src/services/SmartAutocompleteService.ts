/**
 * SmartAutocompleteService
 *
 * Provides intelligent autocomplete suggestions sourced from:
 *  1. localStorage history (per-field, last 50 entries)
 *  2. 3-second persistence rule: new entries only stick if the user
 *     has NOT typed anything else for 3 seconds.
 *
 * Usage:
 *   const svc = new SmartAutocompleteService('task-title');
 *   svc.suggest('bui')  // => ['Build offline sync', 'Build dashboards']
 *   svc.commit('Build deployment script');  // saves after 3s idle
 */

const MAX_ENTRIES = 50;
const PERSIST_DELAY_MS = 3_000;

function storageKey(field: string): string {
  return `_ac_${field}`;
}

function loadEntries(field: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(field));
    const parsed = SafeJsonService.parse<unknown[]>(raw, []);
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function saveEntries(field: string, entries: string[]): void {
  try {
    const serialized = SafeJsonService.tryStringify(
      entries.slice(0, MAX_ENTRIES),
    );
    if (!serialized) {
      return;
    }
    localStorage.setItem(storageKey(field), serialized);
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export default class SmartAutocompleteService {
  #field: string;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(field: string) {
    this.#field = field;
  }

  /** Return suggestions matching the prefix (case-insensitive). */
  suggest(prefix: string, limit = 8): string[] {
    if (!prefix || prefix.length < 2) return [];
    const lc = prefix.toLowerCase();
    return loadEntries(this.#field)
      .filter((e) => e.toLowerCase().includes(lc))
      .slice(0, limit);
  }

  /**
   * Schedule an entry to be saved after 3 s of inactivity.
   * If the user types again within 3 s, the timer resets.
   */
  commit(value: string): void {
    if (!value || value.trim().length < 2) return;
    if (this.#timer) clearTimeout(this.#timer);

    this.#timer = setTimeout(() => {
      const entries = loadEntries(this.#field);
      const trimmed = value.trim();
      // Deduplicate
      const idx = entries.indexOf(trimmed);
      if (idx >= 0) entries.splice(idx, 1);
      entries.unshift(trimmed);
      saveEntries(this.#field, entries);
      this.#timer = null;
    }, PERSIST_DELAY_MS);
  }

  /** Cancel any pending commit. */
  cancel(): void {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  /** Clear all stored suggestions for this field. */
  clear(): void {
    this.cancel();
    try {
      localStorage.removeItem(storageKey(this.#field));
    } catch {
      /* noop */
    }
  }
}
import SafeJsonService from "./SafeJsonService";
