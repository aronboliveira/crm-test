/**
 * @fileoverview Mapping service that applies parsed import rows to an
 * integration config form.
 *
 * Follows **Single Responsibility** — this class only maps field names,
 * while parsing is delegated to `IFileParser` implementations.
 * @module utils/import/IntegrationFormMapper
 */

/**
 * A generic import row: string-keyed record with mixed value types.
 * Compatible with `ImportRawRecord` from the parser subsystem.
 */
export type ImportRow = Record<string, string | number | boolean | null>;

/** Mapping rule: import field key → form field key. */
export interface FieldMappingRule {
  readonly importKey: string;
  readonly formKey: string;
  readonly transform?: (value: unknown) => unknown;
}

/**
 * Maps imported data rows onto integration config form objects.
 *
 * Usage:
 * ```ts
 * const mapper = new IntegrationFormMapper(GLPI_FIELD_MAPPINGS);
 * const filled = mapper.applyFirst(parsedRows, currentFormState);
 * ```
 */
export class IntegrationFormMapper<TForm extends Record<string, unknown>> {
  private readonly rules: readonly FieldMappingRule[];

  constructor(rules: readonly FieldMappingRule[]) {
    this.rules = rules;
  }

  /**
   * Apply the first row's values to a target form object.
   * Returns a **new** object — does not mutate the input.
   */
  applyFirst(rows: readonly ImportRow[], form: TForm): TForm {
    const first = rows[0];
    if (!first) return { ...form };
    return this.applyRow(first, form);
  }

  /**
   * Apply a specific row to the form.
   * Only mapped fields found in the row are overwritten; others are preserved.
   */
  applyRow(row: ImportRow, form: TForm): TForm {
    const result = { ...form };

    for (const rule of this.rules) {
      const rawValue = this.resolveValue(row, rule.importKey);
      if (rawValue === undefined) continue;

      const value = rule.transform ? rule.transform(rawValue) : rawValue;
      (result as Record<string, unknown>)[rule.formKey] = value;
    }

    return result;
  }

  /** Get the list of mapping rules (for UI preview). */
  getRules(): readonly FieldMappingRule[] {
    return this.rules;
  }

  /* ----- Private helpers ------------------------------------------------ */

  /**
   * Case-insensitive field lookup.
   * Tries exact match first, then normalised (lowercase, no underscores/hyphens).
   */
  private resolveValue(row: ImportRow, importKey: string): unknown {
    // Exact key match
    if (importKey in row) return row[importKey];

    // Normalised lookup
    const norm = IntegrationFormMapper.normaliseKey(importKey);
    for (const [key, value] of Object.entries(row)) {
      if (IntegrationFormMapper.normaliseKey(key) === norm) return value;
    }

    return undefined;
  }

  private static normaliseKey(key: string): string {
    return key.toLowerCase().replace(/[-_ ]/g, "");
  }
}

/* -------------------------------------------------------------------------- */
/*  Pre-built field mappings per integration                                  */
/* -------------------------------------------------------------------------- */

const identity = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));
const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string")
    return ["true", "1", "sim", "yes"].includes(v.toLowerCase());
  return Boolean(v);
};

export const GLPI_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "baseUrl", formKey: "baseUrl", transform: identity },
  { importKey: "base_url", formKey: "baseUrl", transform: identity },
  { importKey: "url", formKey: "baseUrl", transform: identity },
  { importKey: "appToken", formKey: "appToken", transform: identity },
  { importKey: "app_token", formKey: "appToken", transform: identity },
  { importKey: "userToken", formKey: "userToken", transform: identity },
  { importKey: "user_token", formKey: "userToken", transform: identity },
  { importKey: "username", formKey: "username", transform: identity },
  { importKey: "password", formKey: "password", transform: identity },
];

export const SAT_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "baseUrl", formKey: "baseUrl", transform: identity },
  { importKey: "base_url", formKey: "baseUrl", transform: identity },
  { importKey: "url", formKey: "baseUrl", transform: identity },
  { importKey: "clientId", formKey: "clientId", transform: identity },
  { importKey: "client_id", formKey: "clientId", transform: identity },
  { importKey: "clientSecret", formKey: "clientSecret", transform: identity },
  { importKey: "client_secret", formKey: "clientSecret", transform: identity },
  { importKey: "companyId", formKey: "companyId", transform: identity },
  { importKey: "company_id", formKey: "companyId", transform: identity },
  { importKey: "syncInvoices", formKey: "syncInvoices", transform: toBool },
  { importKey: "sync_invoices", formKey: "syncInvoices", transform: toBool },
  { importKey: "syncProducts", formKey: "syncProducts", transform: toBool },
  { importKey: "sync_products", formKey: "syncProducts", transform: toBool },
];

export const NEXTCLOUD_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "baseUrl", formKey: "baseUrl", transform: identity },
  { importKey: "base_url", formKey: "baseUrl", transform: identity },
  { importKey: "url", formKey: "baseUrl", transform: identity },
  { importKey: "username", formKey: "username", transform: identity },
  { importKey: "defaultFolder", formKey: "defaultFolder", transform: identity },
  {
    importKey: "default_folder",
    formKey: "defaultFolder",
    transform: identity,
  },
  { importKey: "folder", formKey: "defaultFolder", transform: identity },
  { importKey: "appPassword", formKey: "appPassword", transform: identity },
  { importKey: "app_password", formKey: "appPassword", transform: identity },
  { importKey: "password", formKey: "password", transform: identity },
];

export const ZIMBRA_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "baseUrl", formKey: "baseUrl", transform: identity },
  { importKey: "base_url", formKey: "baseUrl", transform: identity },
  { importKey: "url", formKey: "baseUrl", transform: identity },
  { importKey: "username", formKey: "username", transform: identity },
  { importKey: "password", formKey: "password", transform: identity },
];

export const OUTLOOK_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "tenantId", formKey: "tenantId", transform: identity },
  { importKey: "tenant_id", formKey: "tenantId", transform: identity },
  { importKey: "clientId", formKey: "clientId", transform: identity },
  { importKey: "client_id", formKey: "clientId", transform: identity },
  { importKey: "clientSecret", formKey: "clientSecret", transform: identity },
  { importKey: "client_secret", formKey: "clientSecret", transform: identity },
];

export const WHATSAPP_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "accessToken", formKey: "accessToken", transform: identity },
  { importKey: "access_token", formKey: "accessToken", transform: identity },
  {
    importKey: "businessAccountId",
    formKey: "businessAccountId",
    transform: identity,
  },
  {
    importKey: "business_account_id",
    formKey: "businessAccountId",
    transform: identity,
  },
  { importKey: "phoneNumberId", formKey: "phoneNumberId", transform: identity },
  {
    importKey: "phone_number_id",
    formKey: "phoneNumberId",
    transform: identity,
  },
  { importKey: "apiVersion", formKey: "apiVersion", transform: identity },
  { importKey: "api_version", formKey: "apiVersion", transform: identity },
];

export const OPENAI_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "apiKey", formKey: "apiKey", transform: identity },
  { importKey: "api_key", formKey: "apiKey", transform: identity },
  { importKey: "model", formKey: "model", transform: identity },
  { importKey: "temperature", formKey: "temperature", transform: identity },
  { importKey: "maxTokens", formKey: "maxTokens", transform: identity },
  { importKey: "max_tokens", formKey: "maxTokens", transform: identity },
  {
    importKey: "systemPrompt",
    formKey: "systemPrompt",
    transform: identity,
  },
  {
    importKey: "system_prompt",
    formKey: "systemPrompt",
    transform: identity,
  },
  { importKey: "apiBaseUrl", formKey: "apiBaseUrl", transform: identity },
  {
    importKey: "api_base_url",
    formKey: "apiBaseUrl",
    transform: identity,
  },
];

export const DEEPSEEK_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "apiKey", formKey: "apiKey", transform: identity },
  { importKey: "api_key", formKey: "apiKey", transform: identity },
  { importKey: "model", formKey: "model", transform: identity },
  { importKey: "temperature", formKey: "temperature", transform: identity },
  { importKey: "maxTokens", formKey: "maxTokens", transform: identity },
  { importKey: "max_tokens", formKey: "maxTokens", transform: identity },
  {
    importKey: "systemPrompt",
    formKey: "systemPrompt",
    transform: identity,
  },
  {
    importKey: "system_prompt",
    formKey: "systemPrompt",
    transform: identity,
  },
  { importKey: "apiBaseUrl", formKey: "apiBaseUrl", transform: identity },
  {
    importKey: "api_base_url",
    formKey: "apiBaseUrl",
    transform: identity,
  },
];

export const GEMINI_FIELD_MAPPINGS: readonly FieldMappingRule[] = [
  { importKey: "apiKey", formKey: "apiKey", transform: identity },
  { importKey: "api_key", formKey: "apiKey", transform: identity },
  { importKey: "model", formKey: "model", transform: identity },
  { importKey: "temperature", formKey: "temperature", transform: identity },
  {
    importKey: "maxOutputTokens",
    formKey: "maxOutputTokens",
    transform: identity,
  },
  {
    importKey: "max_output_tokens",
    formKey: "maxOutputTokens",
    transform: identity,
  },
  {
    importKey: "systemInstruction",
    formKey: "systemInstruction",
    transform: identity,
  },
  {
    importKey: "system_instruction",
    formKey: "systemInstruction",
    transform: identity,
  },
];
