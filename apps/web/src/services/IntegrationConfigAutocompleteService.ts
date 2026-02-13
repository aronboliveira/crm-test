import IdleTaskScheduler from "./IdleTaskScheduler";
import InputSuggestionListService from "./InputSuggestionListService";
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
const MAX_SUGGESTIONS = 5;
const MIN_VALUE_LENGTH = 2;
const PERSIST_IDLE_MS = 5_000;

const LIST_POLICY = new InputSuggestionListService({
  minLength: MIN_VALUE_LENGTH,
  maxEntries: MAX_INPUT_VALUES,
  maxSuggestions: MAX_SUGGESTIONS,
});

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

const sanitizeValue = (value: unknown): string => LIST_POLICY.sanitize(value);

const normalizeValues = (values: unknown): string[] =>
  LIST_POLICY.normalizeEntries(values);

const mergeUnique = (
  candidates: Iterable<unknown>,
  limit = MAX_INPUT_VALUES,
): string[] => LIST_POLICY.mergeUnique(candidates, limit);

const isSensitiveInput = (inputId: string): boolean => {
  const normalized = normalizeKeyPart(inputId);
  return SENSITIVE_INPUT_HINTS.some((hint) => normalized.includes(hint));
};

const normalizeStore = (raw: unknown): IntegrationAutocompleteStore => {
  const record = SafeJsonService.asObject(raw);
  const formsRecord = SafeJsonService.asObject(record.forms);
  const forms: Record<string, IntegrationAutocompleteFormRecord> = {};

  for (const [formId, formCandidate] of Object.entries(formsRecord)) {
    const formObject = SafeJsonService.asObject(formCandidate);
    const inputsRecord = SafeJsonService.asObject(formObject.inputs);

    const inputs: Record<string, IntegrationAutocompleteInputRecord> = {};
    for (const [inputId, inputCandidate] of Object.entries(inputsRecord)) {
      const inputObject = SafeJsonService.asObject(inputCandidate);
      const values = normalizeValues(inputObject.values);
      if (!values.length) {
        continue;
      }

      inputs[inputId] = {
        values,
        updatedAtIso: sanitizeValue(inputObject.updatedAtIso),
      };
    }

    if (Object.keys(inputs).length > 0) {
      forms[formId] = { inputs };
    }
  }

  return {
    version: STORE_VERSION,
    forms,
  };
};

export default class IntegrationConfigAutocompleteService {
  #scheduler = new IdleTaskScheduler();

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

  listSuggestions(formId: string, inputId: string, limit = MAX_SUGGESTIONS): string[] {
    if (isSensitiveInput(inputId)) {
      return [];
    }

    const effectiveLimit = LIST_POLICY.clampSuggestionLimit(limit);
    const normalizedFormId = normalizeKeyPart(formId);
    const normalizedInputId = normalizeKeyPart(inputId);
    const store = this.#readStore();
    const savedValues =
      store.forms[normalizedFormId]?.inputs[normalizedInputId]?.values ?? [];
    const defaults = this.#defaultSuggestionsForInput(normalizedInputId);

    return mergeUnique([...savedValues, ...defaults], effectiveLimit);
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
    const nextValue = sanitizeValue(value);
    if (!LIST_POLICY.accepts(nextValue)) {
      this.#scheduler.cancel(inputKey);
      return;
    }

    this.#scheduler.schedule(inputKey, PERSIST_IDLE_MS, () => {
      this.persistNow(formId, inputId, nextValue);
      onPersisted?.();
    });
  }

  persistNow(formId: string, inputId: string, value: string): void {
    if (isSensitiveInput(inputId)) {
      return;
    }

    const normalizedFormId = normalizeKeyPart(formId);
    const normalizedInputId = normalizeKeyPart(inputId);
    const sanitized = sanitizeValue(value);
    if (!LIST_POLICY.accepts(sanitized)) {
      return;
    }

    const store = this.#readStore();
    const formRecord = store.forms[normalizedFormId] ?? { inputs: {} };
    const inputRecord = formRecord.inputs[normalizedInputId] ?? {
      values: [],
      updatedAtIso: "",
    };

    const nextValues = mergeUnique([sanitized, ...inputRecord.values], MAX_INPUT_VALUES);

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
    this.#scheduler.cancelAll();
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
