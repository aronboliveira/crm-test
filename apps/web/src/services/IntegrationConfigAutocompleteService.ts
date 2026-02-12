import SafeJsonService from "./SafeJsonService";
import StorageService from "./StorageService";

interface IntegrationAutocompleteInputRecord {
  values: string[];
  updatedAtIso: string;
}

interface IntegrationAutocompleteFormRecord {
  inputs: Record<string, IntegrationAutocompleteInputRecord>;
}

interface IntegrationAutocompleteStore {
  version: 1;
  forms: Record<string, IntegrationAutocompleteFormRecord>;
}

const STORAGE_KEY = "integrations.config.autocomplete.history.v1";
const STORE_VERSION = 1 as const;
const MAX_INPUT_VALUES = 12;
const MIN_VALUE_LENGTH = 2;
const PERSIST_IDLE_MS = 5_000;

const SENSITIVE_INPUT_HINTS = [
  "password",
  "token",
  "secret",
  "clientsecret",
  "accesstoken",
  "usertoken",
  "apptoken",
];

const DEFAULT_VALUES_BY_INPUT_ID: Record<string, readonly string[]> = Object.freeze({
  baseUrl: Object.freeze([
    "https://localhost",
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ]),
  defaultFolder: Object.freeze(["/CRM"]),
  apiVersion: Object.freeze(["v18.0"]),
  port: Object.freeze(["8080"]),
});

const EMPTY_STORE: IntegrationAutocompleteStore = Object.freeze({
  version: STORE_VERSION,
  forms: {},
});

const normalizeKeyPart = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-");

const sanitizeValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeValues = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const candidate of values) {
    const trimmed = sanitizeValue(candidate);
    if (trimmed.length < MIN_VALUE_LENGTH) continue;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(trimmed);
    if (normalized.length >= MAX_INPUT_VALUES) break;
  }

  return normalized;
};

const mergeUnique = (candidates: readonly string[]): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const trimmed = sanitizeValue(candidate);
    if (trimmed.length < MIN_VALUE_LENGTH) continue;

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    merged.push(trimmed);
  }

  return merged;
};

const isSensitiveInput = (inputId: string): boolean => {
  const normalized = normalizeKeyPart(inputId);
  return SENSITIVE_INPUT_HINTS.some((hint) => normalized.includes(hint));
};

const normalizeStore = (raw: unknown): IntegrationAutocompleteStore => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      version: STORE_VERSION,
      forms: {},
    };
  }

  const record = raw as Record<string, unknown>;
  const formsRecord = SafeJsonService.parseObject(
    SafeJsonService.tryStringify(record.forms),
    {},
  );

  const forms: Record<string, IntegrationAutocompleteFormRecord> = {};
  for (const [formId, formCandidate] of Object.entries(formsRecord)) {
    if (!formCandidate || typeof formCandidate !== "object") continue;
    const formObject = formCandidate as Record<string, unknown>;
    const inputsRecord = SafeJsonService.parseObject(
      SafeJsonService.tryStringify(formObject.inputs),
      {},
    );

    const inputs: Record<string, IntegrationAutocompleteInputRecord> = {};
    for (const [inputId, inputCandidate] of Object.entries(inputsRecord)) {
      if (!inputCandidate || typeof inputCandidate !== "object") continue;
      const inputObject = inputCandidate as Record<string, unknown>;
      const values = normalizeValues(inputObject.values);
      if (!values.length) continue;

      const updatedAtIso = sanitizeValue(inputObject.updatedAtIso) || "";
      inputs[inputId] = {
        values,
        updatedAtIso,
      };
    }

    if (Object.keys(inputs).length) {
      forms[formId] = { inputs };
    }
  }

  return {
    version: STORE_VERSION,
    forms,
  };
};

export default class IntegrationConfigAutocompleteService {
  #timersByInputKey = new Map<string, ReturnType<typeof setTimeout>>();

  static persistDelayMs(): number {
    return PERSIST_IDLE_MS;
  }

  static datalistId(formId: string, inputId: string): string {
    return [
      "integration-config-suggestions",
      normalizeKeyPart(formId),
      normalizeKeyPart(inputId),
    ].join("-");
  }

  listSuggestions(
    formId: string,
    inputId: string,
    limit = MAX_INPUT_VALUES,
  ): string[] {
    if (isSensitiveInput(inputId)) {
      return [];
    }

    const normalizedFormId = normalizeKeyPart(formId);
    const normalizedInputId = normalizeKeyPart(inputId);
    const store = this.#readStore();
    const savedValues =
      store.forms[normalizedFormId]?.inputs[normalizedInputId]?.values ?? [];
    const defaults = this.#defaultSuggestionsForInput(normalizedInputId);

    return mergeUnique([...savedValues, ...defaults]).slice(0, limit);
  }

  schedulePersist(
    formId: string,
    inputId: string,
    value: string,
    onPersisted?: () => void,
  ): void {
    if (isSensitiveInput(inputId)) {
      return;
    }

    const inputKey = this.#timerKey(formId, inputId);
    const currentTimer = this.#timersByInputKey.get(inputKey);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const nextValue = sanitizeValue(value);
    if (nextValue.length < MIN_VALUE_LENGTH) {
      this.#timersByInputKey.delete(inputKey);
      return;
    }

    const timer = setTimeout(() => {
      this.persistNow(formId, inputId, nextValue);
      this.#timersByInputKey.delete(inputKey);
      onPersisted?.();
    }, PERSIST_IDLE_MS);
    this.#timersByInputKey.set(inputKey, timer);
  }

  persistNow(formId: string, inputId: string, value: string): void {
    if (isSensitiveInput(inputId)) {
      return;
    }

    const normalizedFormId = normalizeKeyPart(formId);
    const normalizedInputId = normalizeKeyPart(inputId);
    const sanitized = sanitizeValue(value);
    if (sanitized.length < MIN_VALUE_LENGTH) {
      return;
    }

    const store = this.#readStore();
    const formRecord = store.forms[normalizedFormId] ?? { inputs: {} };
    const inputRecord = formRecord.inputs[normalizedInputId] ?? {
      values: [],
      updatedAtIso: "",
    };

    const nextValues = mergeUnique([sanitized, ...inputRecord.values]).slice(
      0,
      MAX_INPUT_VALUES,
    );

    formRecord.inputs[normalizedInputId] = {
      values: nextValues,
      updatedAtIso: new Date().toISOString(),
    };
    store.forms[normalizedFormId] = formRecord;

    this.#writeStore(store);
  }

  persistBatch(formId: string, valuesByInput: Record<string, string>): void {
    for (const [inputId, value] of Object.entries(valuesByInput)) {
      this.persistNow(formId, inputId, value);
    }
  }

  cancelAll(): void {
    for (const timer of this.#timersByInputKey.values()) {
      clearTimeout(timer);
    }
    this.#timersByInputKey.clear();
  }

  #timerKey(formId: string, inputId: string): string {
    return `${normalizeKeyPart(formId)}:${normalizeKeyPart(inputId)}`;
  }

  #defaultSuggestionsForInput(inputId: string): string[] {
    const direct = DEFAULT_VALUES_BY_INPUT_ID[inputId];
    if (direct) {
      return [...direct];
    }

    if (inputId.includes("baseurl")) {
      return [...(DEFAULT_VALUES_BY_INPUT_ID.baseUrl ?? [])];
    }

    if (inputId.includes("port")) {
      return [...(DEFAULT_VALUES_BY_INPUT_ID.port ?? [])];
    }

    return [];
  }

  #readStore(): IntegrationAutocompleteStore {
    const raw = StorageService.local.getJson<unknown>(STORAGE_KEY, EMPTY_STORE);
    return normalizeStore(raw);
  }

  #writeStore(store: IntegrationAutocompleteStore): void {
    StorageService.local.setJson(STORAGE_KEY, store);
  }
}
