import type {
  FieldErrorMap,
  ImportEntityKind,
  ImportValidationResult,
} from "./ImportTypes";

export abstract class ImportBlueprint<
  TDraft extends Record<string, unknown>,
  TPayload extends Record<string, unknown>,
> {
  abstract readonly kind: ImportEntityKind;
  abstract readonly label: string;

  abstract createDraft(): TDraft;
  abstract validateDraftSync(draft: TDraft): FieldErrorMap<TDraft>;
  abstract toPayload(draft: TDraft): TPayload;
  abstract summarize(payload: TPayload): string;

  async validateDraft(draft: TDraft): Promise<ImportValidationResult<TDraft>> {
    const errors = this.validateDraftSync(draft);
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      warnings: [],
    };
  }
}
