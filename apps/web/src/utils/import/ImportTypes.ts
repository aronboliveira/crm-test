export type ImportEntityKind =
  | "clients"
  | "projects"
  | "users"
  | "tasks"
  | "leads";

export type ValidationErrorKey<TDraft> =
  | Extract<keyof TDraft, string>
  | "__form";

export type FieldErrorMap<TDraft> = Partial<
  Record<ValidationErrorKey<TDraft>, string>
>;

export type ImportValidationResult<TDraft> = Readonly<{
  valid: boolean;
  errors: FieldErrorMap<TDraft>;
  warnings: readonly string[];
}>;

export type ImportApprovalStatus = "pending" | "success" | "failed";

export type ImportApprovalItem<TPayload> = Readonly<{
  id: string;
  payload: TPayload;
  summary: string;
  approved: boolean;
  status: ImportApprovalStatus;
  error?: string;
}>;

export type ImportExecutionItemResult = Readonly<{
  index: number;
  ok: boolean;
  error?: string;
}>;

export type ImportExecutionResult = Readonly<{
  successCount: number;
  failureCount: number;
  items: readonly ImportExecutionItemResult[];
}>;
