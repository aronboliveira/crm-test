import { ImportBlueprint } from "../ImportBlueprint";
import type { CepLookupGateway, CepLookupResult } from "../CepLookupGateway";
import ImportFieldRules from "../ImportFieldRules";
import type { FieldErrorMap, ImportValidationResult } from "../ImportTypes";

export type ClientImportDraft = {
  name: string;
  type: "pessoa" | "empresa";
  company: string;
  cnpj: string;
  cep: string;
  email: string;
  phone: string;
  cellPhone: string;
  whatsappNumber: string;
  preferredContact: "email" | "phone" | "whatsapp" | "cellphone";
  notes: string;
};

export type ClientImportPayload = Readonly<{
  name: string;
  type: "pessoa" | "empresa";
  company?: string;
  cnpj?: string;
  cep?: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  whatsappNumber?: string;
  hasWhatsapp: boolean;
  preferredContact: "email" | "phone" | "whatsapp" | "cellphone";
  notes?: string;
}>;

export class ClientImportBlueprint extends ImportBlueprint<
  ClientImportDraft,
  ClientImportPayload
> {
  readonly kind = "clients" as const;
  readonly label = "Clientes";
  private readonly cepLookupGateway: CepLookupGateway;

  constructor(cepLookupGateway: CepLookupGateway) {
    super();
    this.cepLookupGateway = cepLookupGateway;
  }

  createDraft(): ClientImportDraft {
    return {
      name: "",
      type: "pessoa",
      company: "",
      cnpj: "",
      cep: "",
      email: "",
      phone: "",
      cellPhone: "",
      whatsappNumber: "",
      preferredContact: "email",
      notes: "",
    };
  }

  validateDraftSync(draft: ClientImportDraft): FieldErrorMap<ClientImportDraft> {
    const errors: FieldErrorMap<ClientImportDraft> = {};
    const normalizedName = ImportFieldRules.normalizeText(draft.name);
    const normalizedEmail = draft.email.trim();
    const normalizedPhone = draft.phone.trim();
    const normalizedCell = draft.cellPhone.trim();
    const normalizedWhatsapp = draft.whatsappNumber.trim();
    const normalizedCnpj = ImportFieldRules.normalizeCnpj(draft.cnpj);
    const normalizedCep = ImportFieldRules.normalizeCep(draft.cep);

    if (!normalizedName || normalizedName.length < 2) {
      errors.name = "Nome é obrigatório (mínimo 2 caracteres).";
    }

    if (draft.type !== "pessoa" && draft.type !== "empresa") {
      errors.type = "Tipo inválido.";
    }

    if (draft.type === "empresa") {
      if (!normalizedCnpj) {
        errors.cnpj = "CNPJ é obrigatório para clientes do tipo Empresa.";
      } else if (!ImportFieldRules.isValidCnpj(normalizedCnpj)) {
        errors.cnpj = "CNPJ inválido (use 00.000.000/0000-00).";
      }

      if (!normalizedCep) {
        errors.cep = "CEP é obrigatório para clientes do tipo Empresa.";
      } else if (!ImportFieldRules.isValidCep(normalizedCep)) {
        errors.cep = "CEP inválido (use 00000-000).";
      }
    }

    if (normalizedEmail && !ImportFieldRules.isValidEmail(normalizedEmail)) {
      errors.email = "E-mail inválido.";
    }

    if (normalizedPhone && !ImportFieldRules.isValidPhone(normalizedPhone)) {
      errors.phone = "Telefone inválido.";
    }

    if (normalizedCell && !ImportFieldRules.isValidPhone(normalizedCell)) {
      errors.cellPhone = "Celular inválido.";
    }

    if (normalizedWhatsapp && !ImportFieldRules.isValidPhone(normalizedWhatsapp)) {
      errors.whatsappNumber = "WhatsApp inválido.";
    }

    if (draft.preferredContact === "whatsapp" && !normalizedWhatsapp && !normalizedCell) {
      errors.preferredContact =
        "Selecione WhatsApp apenas quando houver número de celular/WhatsApp.";
    }

    return errors;
  }

  async lookupCep(cep: string): Promise<CepLookupResult> {
    return this.cepLookupGateway.lookup(cep);
  }

  async validateDraft(
    draft: ClientImportDraft,
  ): Promise<ImportValidationResult<ClientImportDraft>> {
    const syncErrors = this.validateDraftSync(draft);
    if (Object.keys(syncErrors).length > 0) {
      return {
        valid: false,
        errors: syncErrors,
        warnings: [],
      };
    }

    if (draft.type === "empresa") {
      const cepResult = await this.lookupCep(draft.cep);
      if (!cepResult.ok) {
        return {
          valid: false,
          errors: {
            ...syncErrors,
            cep: cepResult.message ?? "CEP não encontrado.",
          },
          warnings: [],
        };
      }
    }

    return {
      valid: true,
      errors: {},
      warnings: [],
    };
  }

  toPayload(draft: ClientImportDraft): ClientImportPayload {
    const normalizedType = draft.type === "empresa" ? "empresa" : "pessoa";
    const normalizedCnpj =
      normalizedType === "empresa"
        ? ImportFieldRules.normalizeCnpj(draft.cnpj)
        : "";
    const normalizedCep =
      normalizedType === "empresa" ? ImportFieldRules.normalizeCep(draft.cep) : "";
    const normalizedWhatsapp = ImportFieldRules.normalizePhone(draft.whatsappNumber);
    const normalizedCell = ImportFieldRules.normalizePhone(draft.cellPhone);

    return {
      name: ImportFieldRules.normalizeText(draft.name),
      type: normalizedType,
      company: ImportFieldRules.normalizeText(draft.company) || undefined,
      cnpj: normalizedCnpj || undefined,
      cep: normalizedCep || undefined,
      email: draft.email.trim() || undefined,
      phone: ImportFieldRules.normalizePhone(draft.phone) || undefined,
      cellPhone: normalizedCell || undefined,
      whatsappNumber: normalizedWhatsapp || undefined,
      hasWhatsapp: Boolean(normalizedWhatsapp || normalizedCell),
      preferredContact: draft.preferredContact,
      notes: ImportFieldRules.normalizeText(draft.notes) || undefined,
    };
  }

  summarize(payload: ClientImportPayload): string {
    const typeLabel = payload.type === "empresa" ? "Empresa" : "Pessoa";
    return `${payload.name} • ${typeLabel}${payload.company ? ` • ${payload.company}` : ""}`;
  }
}
