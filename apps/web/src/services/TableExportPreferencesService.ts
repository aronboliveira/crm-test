import type { SpreadsheetExportFormat } from "../utils/export";
import SafeJsonService from "./SafeJsonService";
import StorageService from "./StorageService";

type TableExportSelection = Readonly<{
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
}>;

type TableExportPreferencesStore = Readonly<{
  version: 1;
  presets: Record<string, TableExportSelection>;
}>;

type TableExportDefaults = Readonly<{
  defaultFormats: readonly SpreadsheetExportFormat[];
  defaultColumnKeys: readonly string[];
  availableColumnKeys: readonly string[];
}>;

type TableExportLoadParams = Readonly<
  {
    presetKey?: string;
  } & TableExportDefaults
>;

type TableExportSaveParams = Readonly<
  {
    presetKey?: string;
    formats: readonly SpreadsheetExportFormat[];
    columnKeys: readonly string[];
  } & TableExportDefaults
>;

const STORAGE_KEY = "table.export.preferences.v1";
const STORE_VERSION = 1 as const;
const MAX_COLUMNS = 64;
const VALID_FORMATS = Object.freeze(["csv", "xlsx"] as const);
const EMPTY_STORE: TableExportPreferencesStore = Object.freeze({
  version: STORE_VERSION,
  presets: {},
});

const sanitizePresetKey = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");

const sanitizeColumnKey = (value: unknown): string =>
  String(value || "").trim();

const normalizeAvailableColumns = (values: readonly string[]): string[] => {
  const unique = new Set<string>();
  values.forEach((value) => {
    const key = sanitizeColumnKey(value);
    if (key) unique.add(key);
  });
  return [...unique].slice(0, MAX_COLUMNS);
};

const normalizeFormats = (
  values: readonly unknown[],
  fallback: readonly SpreadsheetExportFormat[],
): SpreadsheetExportFormat[] => {
  const selected = values
    .map((value) => String(value || "").trim())
    .filter(
      (value): value is SpreadsheetExportFormat =>
        VALID_FORMATS.includes(value as SpreadsheetExportFormat),
    );

  const unique = [...new Set(selected)];
  if (unique.length > 0) {
    return unique;
  }
  return [...new Set(fallback)];
};

const normalizeColumns = (
  values: readonly unknown[],
  availableColumns: readonly string[],
  fallbackColumns: readonly string[],
): string[] => {
  const allowed = new Set(availableColumns);
  const filtered = values
    .map((value) => sanitizeColumnKey(value))
    .filter((value) => value && allowed.has(value));
  const unique = [...new Set(filtered)];
  if (unique.length > 0) {
    return unique;
  }
  const fallback = fallbackColumns.filter((key) => allowed.has(key));
  if (fallback.length > 0) {
    return [...new Set(fallback)];
  }
  return [...availableColumns];
};

const normalizeDefaults = (defaults: TableExportDefaults): TableExportSelection => {
  const availableColumns = normalizeAvailableColumns(defaults.availableColumnKeys);
  const defaultColumns = normalizeAvailableColumns(defaults.defaultColumnKeys);
  const defaultFormats = normalizeFormats(
    defaults.defaultFormats,
    VALID_FORMATS as readonly SpreadsheetExportFormat[],
  );

  return {
    formats: defaultFormats,
    columnKeys: normalizeColumns(defaultColumns, availableColumns, availableColumns),
  };
};

const normalizeSelection = (
  raw: unknown,
  defaults: TableExportDefaults,
): TableExportSelection => {
  const normalizedDefaults = normalizeDefaults(defaults);
  const availableColumns = normalizeAvailableColumns(defaults.availableColumnKeys);
  const record = SafeJsonService.asObject(raw);
  return {
    formats: normalizeFormats(
      SafeJsonService.asArray<string>(record.formats),
      normalizedDefaults.formats,
    ),
    columnKeys: normalizeColumns(
      SafeJsonService.asArray<string>(record.columnKeys),
      availableColumns,
      normalizedDefaults.columnKeys,
    ),
  };
};

const normalizeStore = (raw: unknown): TableExportPreferencesStore => {
  const root = SafeJsonService.asObject(raw);
  const presetsRaw = SafeJsonService.asObject(root.presets);
  const presets: Record<string, TableExportSelection> = {};

  for (const [key, candidate] of Object.entries(presetsRaw)) {
    const presetKey = sanitizePresetKey(key);
    if (!presetKey) continue;
    const selection = SafeJsonService.asObject(candidate);
    const formats = normalizeFormats(
      SafeJsonService.asArray<string>(selection.formats),
      VALID_FORMATS as readonly SpreadsheetExportFormat[],
    );
    const columnKeys = normalizeAvailableColumns(
      SafeJsonService.asArray<string>(selection.columnKeys),
    );
    if (!formats.length || !columnKeys.length) continue;
    presets[presetKey] = { formats, columnKeys };
  }

  return {
    version: STORE_VERSION,
    presets,
  };
};

export default class TableExportPreferencesService {
  static load(params: TableExportLoadParams): TableExportSelection {
    const defaults = normalizeDefaults(params);
    const presetKey = sanitizePresetKey(params.presetKey);
    if (!presetKey) {
      return defaults;
    }

    const store = this.#readStore();
    const saved = store.presets[presetKey];
    if (!saved) {
      return defaults;
    }

    return normalizeSelection(saved, params);
  }

  static save(params: TableExportSaveParams): void {
    const presetKey = sanitizePresetKey(params.presetKey);
    if (!presetKey) {
      return;
    }

    const selection = normalizeSelection(
      {
        formats: params.formats,
        columnKeys: params.columnKeys,
      },
      params,
    );
    const store = this.#readStore();
    store.presets[presetKey] = selection;
    this.#writeStore(store);
  }

  static clear(presetKey: string): void {
    const normalizedPresetKey = sanitizePresetKey(presetKey);
    if (!normalizedPresetKey) return;
    const store = this.#readStore();
    if (store.presets[normalizedPresetKey]) {
      delete store.presets[normalizedPresetKey];
      this.#writeStore(store);
    }
  }

  static #readStore(): TableExportPreferencesStore {
    const raw = StorageService.local.getJson<unknown>(STORAGE_KEY, EMPTY_STORE);
    return normalizeStore(raw);
  }

  static #writeStore(store: TableExportPreferencesStore): void {
    StorageService.local.setJson(STORAGE_KEY, store);
  }
}
