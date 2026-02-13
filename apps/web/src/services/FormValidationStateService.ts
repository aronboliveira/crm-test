import { reactive, ref } from "vue";
import { VALIDATION_CLASSES } from "../utils/constants/dom-classes";

export interface ValidationFieldRule {
  required?: boolean;
  validate?: (value: string) => boolean;
  normalize?: (value: unknown) => string;
}

interface ValidationFieldRuntime {
  touched: boolean;
  dirty: boolean;
  initialValue: string;
}

const normalizeDefault = (value: unknown): string =>
  typeof value === "string" ? value : "";

const shouldValidate = (
  fieldValue: string,
  rule: ValidationFieldRule | undefined,
): boolean => {
  if (!rule?.required && !fieldValue.trim()) {
    return false;
  }
  if (rule?.required && !fieldValue.trim()) {
    return true;
  }
  if (typeof rule?.validate === "function") {
    return !rule.validate(fieldValue);
  }
  return false;
};

export default class FormValidationStateService<FieldKey extends string> {
  readonly #rules: Record<FieldKey, ValidationFieldRule>;
  readonly #runtime: Record<FieldKey, ValidationFieldRuntime>;
  readonly #submitted = ref(false);

  constructor(rules: Readonly<Record<FieldKey, ValidationFieldRule>>) {
    this.#rules = { ...(rules as Record<FieldKey, ValidationFieldRule>) };
    const runtime = {} as Record<FieldKey, ValidationFieldRuntime>;

    (Object.keys(this.#rules) as FieldKey[]).forEach((field) => {
      runtime[field] = {
        touched: false,
        dirty: false,
        initialValue: "",
      };
    });

    this.#runtime = reactive(runtime) as Record<FieldKey, ValidationFieldRuntime>;
  }

  hydrate(values: Partial<Record<FieldKey, unknown>> = {}): void {
    (Object.keys(this.#rules) as FieldKey[]).forEach((field) => {
      const normalized = this.#normalize(field, values[field]);
      this.#runtime[field].initialValue = normalized;
      this.#runtime[field].dirty = false;
      this.#runtime[field].touched = false;
    });
    this.#submitted.value = false;
  }

  markSubmitted(): void {
    this.#submitted.value = true;
  }

  markTouched(field: FieldKey): void {
    this.#runtime[field].touched = true;
  }

  handleInput(field: FieldKey, value: unknown): string {
    const normalized = this.#normalize(field, value);
    this.#runtime[field].dirty = normalized !== this.#runtime[field].initialValue;
    return normalized;
  }

  classMap(field: FieldKey, value: unknown): Record<string, boolean> {
    const runtime = this.#runtime[field];
    const normalized = this.#normalize(field, value);
    const shouldEvaluate = this.#submitted.value || runtime.touched || runtime.dirty;
    const invalid = shouldValidate(normalized, this.#rules[field]);
    const hasContent = normalized.trim().length > 0;

    return {
      [VALIDATION_CLASSES.PRISTINE]: !runtime.dirty,
      [VALIDATION_CLASSES.DIRTY]: runtime.dirty,
      [VALIDATION_CLASSES.UNTOUCHED]: !runtime.touched,
      [VALIDATION_CLASSES.TOUCHED]: runtime.touched,
      [VALIDATION_CLASSES.SUBMITTED]: this.#submitted.value,
      [VALIDATION_CLASSES.INVALID]: shouldEvaluate && invalid,
      [VALIDATION_CLASSES.VALID]: shouldEvaluate && !invalid && hasContent,
      [VALIDATION_CLASSES.REQUIRED]: !!this.#rules[field]?.required,
    };
  }

  isInvalid(field: FieldKey, value: unknown): boolean {
    return shouldValidate(this.#normalize(field, value), this.#rules[field]);
  }

  #normalize(field: FieldKey, value: unknown): string {
    const rule = this.#rules[field];
    const normalize = typeof rule?.normalize === "function"
      ? rule.normalize
      : normalizeDefault;
    return normalize(value);
  }
}

