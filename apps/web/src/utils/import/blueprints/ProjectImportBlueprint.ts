import { ImportBlueprint } from "../ImportBlueprint";
import ImportFieldRules from "../ImportFieldRules";
import type { FieldErrorMap } from "../ImportTypes";

export type ProjectImportDraft = {
  name: string;
  code: string;
  description: string;
  status: "planned" | "active" | "blocked" | "done" | "archived";
  ownerEmail: string;
  dueAt: string;
  deadlineAt: string;
  tags: string;
};

export type ProjectImportPayload = Readonly<{
  name: string;
  code?: string;
  description?: string;
  status: "planned" | "active" | "blocked" | "done" | "archived";
  ownerEmail?: string;
  dueAt?: string;
  deadlineAt?: string;
  tags?: string[];
}>;

const PROJECT_STATUS_SET = new Set<ProjectImportDraft["status"]>([
  "planned",
  "active",
  "blocked",
  "done",
  "archived",
]);

export class ProjectImportBlueprint extends ImportBlueprint<
  ProjectImportDraft,
  ProjectImportPayload
> {
  readonly kind = "projects" as const;
  readonly label = "Projetos";

  createDraft(): ProjectImportDraft {
    return {
      name: "",
      code: "",
      description: "",
      status: "planned",
      ownerEmail: "",
      dueAt: "",
      deadlineAt: "",
      tags: "",
    };
  }

  validateDraftSync(
    draft: ProjectImportDraft,
  ): FieldErrorMap<ProjectImportDraft> {
    const errors: FieldErrorMap<ProjectImportDraft> = {};

    if (!ImportFieldRules.normalizeText(draft.name)) {
      errors.name = "Nome do projeto é obrigatório.";
    }

    if (draft.code.trim() && !/^[A-Za-z0-9_-]{2,30}$/.test(draft.code.trim())) {
      errors.code = "Código inválido (2-30, letras/números/_/-).";
    }

    if (!PROJECT_STATUS_SET.has(draft.status)) {
      errors.status = "Status inválido.";
    }

    if (draft.ownerEmail.trim() && !ImportFieldRules.isValidEmail(draft.ownerEmail)) {
      errors.ownerEmail = "E-mail do responsável inválido.";
    }

    if (draft.dueAt.trim() && !ImportFieldRules.isValidDate(draft.dueAt)) {
      errors.dueAt = "Previsão deve estar em YYYY-MM-DD.";
    }

    if (
      draft.deadlineAt.trim() &&
      !ImportFieldRules.isValidDate(draft.deadlineAt)
    ) {
      errors.deadlineAt = "Entrega deve estar em YYYY-MM-DD.";
    }

    return errors;
  }

  toPayload(draft: ProjectImportDraft): ProjectImportPayload {
    const tags = ImportFieldRules.normalizeTagList(draft.tags);
    return {
      name: ImportFieldRules.normalizeText(draft.name),
      code: draft.code.trim().toUpperCase() || undefined,
      description: ImportFieldRules.normalizeText(draft.description) || undefined,
      status: PROJECT_STATUS_SET.has(draft.status) ? draft.status : "planned",
      ownerEmail: draft.ownerEmail.trim() || undefined,
      dueAt: draft.dueAt.trim() || undefined,
      deadlineAt: draft.deadlineAt.trim() || undefined,
      tags: tags.length ? tags : undefined,
    };
  }

  summarize(payload: ProjectImportPayload): string {
    return `${payload.name} • ${payload.status}${payload.ownerEmail ? ` • ${payload.ownerEmail}` : ""}`;
  }
}
