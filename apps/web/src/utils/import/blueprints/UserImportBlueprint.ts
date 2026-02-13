import { ImportBlueprint } from "../ImportBlueprint";
import ImportFieldRules from "../ImportFieldRules";
import type { FieldErrorMap } from "../ImportTypes";

export type UserRoleKey = "admin" | "manager" | "member" | "viewer";

export type UserImportDraft = {
  email: string;
  roleKey: UserRoleKey;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  notes: string;
};

export type UserImportPayload = Readonly<{
  email: string;
  roleKey: UserRoleKey;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  notes?: string;
}>;

const ROLE_SET = new Set<UserRoleKey>(["admin", "manager", "member", "viewer"]);

export class UserImportBlueprint extends ImportBlueprint<
  UserImportDraft,
  UserImportPayload
> {
  readonly kind = "users" as const;
  readonly label = "Usuários";

  createDraft(): UserImportDraft {
    return {
      email: "",
      roleKey: "member",
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      notes: "",
    };
  }

  validateDraftSync(draft: UserImportDraft): FieldErrorMap<UserImportDraft> {
    const errors: FieldErrorMap<UserImportDraft> = {};
    const email = draft.email.trim();

    if (!email) {
      errors.email = "E-mail é obrigatório.";
    } else if (!ImportFieldRules.isValidEmail(email)) {
      errors.email = "E-mail inválido.";
    }

    if (!ROLE_SET.has(draft.roleKey)) {
      errors.roleKey = "Perfil inválido.";
    }

    if (draft.phone.trim() && !ImportFieldRules.isValidPhone(draft.phone)) {
      errors.phone = "Telefone inválido.";
    }

    return errors;
  }

  toPayload(draft: UserImportDraft): UserImportPayload {
    return {
      email: draft.email.trim().toLowerCase(),
      roleKey: ROLE_SET.has(draft.roleKey) ? draft.roleKey : "member",
      firstName: ImportFieldRules.normalizeText(draft.firstName) || undefined,
      lastName: ImportFieldRules.normalizeText(draft.lastName) || undefined,
      phone: ImportFieldRules.normalizePhone(draft.phone) || undefined,
      department: ImportFieldRules.normalizeText(draft.department) || undefined,
      notes: ImportFieldRules.normalizeText(draft.notes) || undefined,
    };
  }

  summarize(payload: UserImportPayload): string {
    return `${payload.email} • ${payload.roleKey}`;
  }
}
