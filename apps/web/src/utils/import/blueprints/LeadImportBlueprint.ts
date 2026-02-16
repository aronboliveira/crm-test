/**
 * @fileoverview Import blueprint for leads from CSV/JSON/XML files.
 *
 * Defines validation rules and transformation logic for lead imports.
 * Supports fields: name, email, phone, company, status, source, assignee, estimated value, notes, tags.
 *
 * @module utils/import/blueprints/LeadImportBlueprint
 */

import { ImportBlueprint } from "../ImportBlueprint";
import ImportFieldRules from "../ImportFieldRules";
import type { FieldErrorMap } from "../ImportTypes";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "social"
  | "email_campaign"
  | "cold_call"
  | "event"
  | "partner"
  | "other";

export type LeadImportDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  source: LeadSource;
  assignedTo: string;
  estimatedValue: string;
  notes: string;
  tags: string;
};

export type LeadImportPayload = Readonly<{
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  assignedTo?: string;
  estimatedValue?: number;
  notes?: string;
  tags?: string[];
}>;

const LEAD_STATUS_SET = new Set<LeadStatus>([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

const LEAD_SOURCE_SET = new Set<LeadSource>([
  "website",
  "referral",
  "social",
  "email_campaign",
  "cold_call",
  "event",
  "partner",
  "other",
]);

/**
 * Blueprint for validating and transforming lead import data.
 *
 * @example
 * ```typescript
 * const blueprint = new LeadImportBlueprint();
 * const draft = blueprint.createDraft();
 * draft.name = "Acme Corp";
 * draft.email = "contact@acme.com";
 * draft.status = "new";
 * draft.source = "website";
 *
 * const errors = await blueprint.validate(draft);
 * if (Object.keys(errors).length === 0) {
 *   const payload = blueprint.toPayload(draft);
 *   await api.leads.create(payload);
 * }
 * ```
 */
export class LeadImportBlueprint extends ImportBlueprint<
  LeadImportDraft,
  LeadImportPayload
> {
  readonly kind = "leads" as const;
  readonly label = "Leads";

  /**
   * Creates an empty draft with default values.
   */
  createDraft(): LeadImportDraft {
    return {
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "new",
      source: "other",
      assignedTo: "",
      estimatedValue: "",
      notes: "",
      tags: "",
    };
  }

  /**
   * Validates a lead draft synchronously.
   * Checks name, email, phone, status, source, estimated value.
   */
  validateDraftSync(draft: LeadImportDraft): FieldErrorMap<LeadImportDraft> {
    const errors: FieldErrorMap<LeadImportDraft> = {};

    // Name is required
    if (!ImportFieldRules.normalizeText(draft.name)) {
      errors.name = "Nome do lead é obrigatório.";
    } else if (draft.name.length > 200) {
      errors.name = "Nome deve ter no máximo 200 caracteres.";
    }

    // Email validation (optional but must be valid if provided)
    if (draft.email.trim() && !ImportFieldRules.isValidEmail(draft.email)) {
      errors.email = "E-mail inválido.";
    }

    // Phone validation (optional but must be valid if provided)
    if (draft.phone.trim()) {
      const normalized = ImportFieldRules.normalizePhone(draft.phone);
      if (!ImportFieldRules.isValidPhone(normalized)) {
        errors.phone = "Telefone inválido. Use DDD + número (10-11 dígitos).";
      }
    }

    // Status validation
    if (!LEAD_STATUS_SET.has(draft.status)) {
      errors.status = `Status inválido. Use: ${Array.from(LEAD_STATUS_SET).join(", ")}.`;
    }

    // Source validation
    if (!LEAD_SOURCE_SET.has(draft.source)) {
      errors.source = `Origem inválida. Use: ${Array.from(LEAD_SOURCE_SET).join(", ")}.`;
    }

    // Estimated value validation (optional, must be numeric)
    if (draft.estimatedValue.trim()) {
      const value = parseFloat(
        draft.estimatedValue.replace(/[^\d.,-]/g, "").replace(",", "."),
      );
      if (isNaN(value) || value < 0) {
        errors.estimatedValue = "Valor estimado deve ser um número positivo.";
      }
    }

    // Assignee email validation (optional)
    if (
      draft.assignedTo.trim() &&
      !ImportFieldRules.isValidEmail(draft.assignedTo)
    ) {
      errors.assignedTo = "E-mail do responsável inválido.";
    }

    return errors;
  }

  /**
   * Transforms a validated draft into API payload.
   */
  toPayload(draft: LeadImportDraft): LeadImportPayload {
    const rawValue = draft.estimatedValue
      .replace(/[^\d.,-]/g, "")
      .replace(",", ".");
    const parsedValue = rawValue ? parseFloat(rawValue) : Number.NaN;

    return {
      name: ImportFieldRules.normalizeText(draft.name),
      status: draft.status,
      source: draft.source,
      email: draft.email.trim().toLowerCase() || undefined,
      phone: ImportFieldRules.normalizePhone(draft.phone) || undefined,
      company: ImportFieldRules.normalizeText(draft.company) || undefined,
      assignedTo: draft.assignedTo.trim().toLowerCase() || undefined,
      estimatedValue:
        Number.isFinite(parsedValue) && parsedValue >= 0
          ? parsedValue
          : undefined,
      notes: ImportFieldRules.normalizeText(draft.notes) || undefined,
      tags: ImportFieldRules.normalizeTagList(draft.tags).length
        ? ImportFieldRules.normalizeTagList(draft.tags)
        : undefined,
    };
  }

  summarize(payload: LeadImportPayload): string {
    return `${payload.name} • ${payload.status} • ${payload.source}`;
  }
}
