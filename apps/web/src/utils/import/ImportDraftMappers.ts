import type { ClientImportDraft } from "./blueprints/ClientImportBlueprint";
import type { LeadImportDraft } from "./blueprints/LeadImportBlueprint";
import type { ProjectImportDraft } from "./blueprints/ProjectImportBlueprint";
import type { TaskImportDraft } from "./blueprints/TaskImportBlueprint";
import type { UserImportDraft } from "./blueprints/UserImportBlueprint";
import type { ImportRawRecord } from "./ImportSourceTypes";
import type { ImportEntityKind } from "./ImportTypes";

export type ImportDraftMappingResult<TDraft> = Readonly<{
  draft: TDraft;
  matchedFieldCount: number;
  unmappedEntries: readonly ImportUnmappedEntry[];
}>;

export type ImportUnmappedEntry = Readonly<{
  key: string;
  value: string;
}>;

interface ImportDraftMapper<TDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<TDraft>;
}

type ImportDraftByKind = {
  clients: ClientImportDraft;
  projects: ProjectImportDraft;
  users: UserImportDraft;
  tasks: TaskImportDraft;
  leads: LeadImportDraft;
};

type ImportDraftMapperByKind = {
  [K in ImportEntityKind]: ImportDraftMapper<ImportDraftByKind[K]>;
};

const normalizeKey = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

class NormalizedRecordReader {
  private readonly values = new Map<string, string>();
  private readonly originalKeyByNormalized = new Map<string, string>();
  private readonly matched = new Set<string>();

  constructor(record: ImportRawRecord) {
    Object.entries(record).forEach(([key, value]) => {
      const normalized = normalizeKey(String(key));
      if (!normalized || this.values.has(normalized)) return;
      this.values.set(normalized, String(value ?? "").trim());
      this.originalKeyByNormalized.set(
        normalized,
        String(key).trim() || normalized,
      );
    });
  }

  pick(...aliases: readonly string[]): string {
    for (const alias of aliases) {
      const normalizedAlias = normalizeKey(alias);
      if (!normalizedAlias) continue;
      if (this.values.has(normalizedAlias)) {
        this.matched.add(normalizedAlias);
        return this.values.get(normalizedAlias) ?? "";
      }
    }
    return "";
  }

  getMatchedFieldCount(): number {
    return this.matched.size;
  }

  listUnmappedEntries(): readonly ImportUnmappedEntry[] {
    const entries: ImportUnmappedEntry[] = [];
    this.values.forEach((value, normalizedKey) => {
      if (!value || this.matched.has(normalizedKey)) return;
      entries.push({
        key: this.originalKeyByNormalized.get(normalizedKey) ?? normalizedKey,
        value,
      });
    });
    return entries;
  }
}

class ClientImportDraftMapper implements ImportDraftMapper<ClientImportDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<ClientImportDraft> {
    const reader = new NormalizedRecordReader(record);
    const resolvedType = this.resolveType(
      reader.pick(
        "type",
        "tipo",
        "client_type",
        "tipo_cliente",
        "tipo_de_cliente",
      ),
    );
    const cnpj = reader.pick("cnpj", "documento", "document", "tax_id");
    const draft: ClientImportDraft = {
      name: reader.pick("name", "nome", "cliente", "client"),
      type: cnpj && resolvedType === "pessoa" ? "empresa" : resolvedType,
      company: reader.pick(
        "company",
        "empresa",
        "organization",
        "organizacao",
        "razao_social",
      ),
      cnpj,
      cep: reader.pick("cep", "postal_code", "zipcode", "zip"),
      email: reader.pick("email", "e-mail", "mail"),
      phone: reader.pick("phone", "telefone", "tel"),
      cellPhone: reader.pick(
        "cellphone",
        "cell_phone",
        "celular",
        "mobile",
        "telefone_celular",
      ),
      whatsappNumber: reader.pick(
        "whatsapp",
        "whatsappNumber",
        "whatsappnumber",
        "whatsapp_number",
        "numero_whatsapp",
        "wa_number",
      ),
      preferredContact: this.resolvePreferredContact(
        reader.pick(
          "preferred_contact",
          "contato_preferido",
          "canal_preferido",
          "contact_preference",
        ),
      ),
      notes: reader.pick(
        "notes",
        "notas",
        "observacao",
        "observacoes",
        "comments",
        "comentarios",
      ),
    };

    return {
      draft,
      matchedFieldCount: reader.getMatchedFieldCount(),
      unmappedEntries: reader.listUnmappedEntries(),
    };
  }

  private resolveType(value: string): ClientImportDraft["type"] {
    const normalized = normalizeKey(value);
    if (
      normalized.includes("empresa") ||
      normalized.includes("company") ||
      normalized === "pj"
    ) {
      return "empresa";
    }
    return "pessoa";
  }

  private resolvePreferredContact(
    value: string,
  ): ClientImportDraft["preferredContact"] {
    const normalized = normalizeKey(value);
    if (normalized.includes("whatsapp")) return "whatsapp";
    if (normalized.includes("cell") || normalized.includes("celular")) {
      return "cellphone";
    }
    if (
      normalized.includes("phone") ||
      normalized.includes("tel") ||
      normalized.includes("telefone")
    ) {
      return "phone";
    }
    return "email";
  }
}

class ProjectImportDraftMapper implements ImportDraftMapper<ProjectImportDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<ProjectImportDraft> {
    const reader = new NormalizedRecordReader(record);
    const draft: ProjectImportDraft = {
      name: reader.pick("name", "nome", "project", "projeto"),
      code: reader.pick("code", "codigo", "project_code", "projectid"),
      description: reader.pick("description", "descricao", "detalhes"),
      notes: reader.pick(
        "notes",
        "notas",
        "observacao",
        "observacoes",
        "comments",
        "comentarios",
      ),
      status: this.resolveStatus(
        reader.pick("status", "estado", "situacao", "stage"),
      ),
      ownerEmail: reader.pick(
        "owner_email",
        "responsavel_email",
        "owner",
        "responsavel",
      ),
      dueAt: reader.pick("due_at", "previsao", "forecast_date", "due_date"),
      deadlineAt: reader.pick(
        "deadline_at",
        "entrega",
        "delivery_date",
        "deadline",
      ),
      tags: reader.pick("tags", "tag", "etiquetas"),
    };

    return {
      draft,
      matchedFieldCount: reader.getMatchedFieldCount(),
      unmappedEntries: reader.listUnmappedEntries(),
    };
  }

  private resolveStatus(value: string): ProjectImportDraft["status"] {
    const normalized = normalizeKey(value);
    if (
      normalized.includes("active") ||
      normalized.includes("ativo") ||
      normalized.includes("andamento")
    ) {
      return "active";
    }
    if (normalized.includes("blocked") || normalized.includes("bloque")) {
      return "blocked";
    }
    if (
      normalized.includes("done") ||
      normalized.includes("conclu") ||
      normalized.includes("finaliz")
    ) {
      return "done";
    }
    if (normalized.includes("archiv") || normalized.includes("arquiv")) {
      return "archived";
    }
    return "planned";
  }
}

class UserImportDraftMapper implements ImportDraftMapper<UserImportDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<UserImportDraft> {
    const reader = new NormalizedRecordReader(record);
    const draft: UserImportDraft = {
      email: reader.pick("email", "e-mail", "mail"),
      roleKey: this.resolveRole(
        reader.pick("role", "perfil", "role_key", "nivel", "tipo_usuario"),
      ),
      firstName: reader.pick("first_name", "firstName", "nome", "given_name"),
      lastName: reader.pick(
        "last_name",
        "lastName",
        "sobrenome",
        "family_name",
      ),
      phone: reader.pick("phone", "telefone", "tel"),
      department: reader.pick("department", "departamento", "team", "equipe"),
      notes: reader.pick(
        "notes",
        "notas",
        "observacao",
        "observacoes",
        "comments",
        "comentarios",
      ),
    };

    return {
      draft,
      matchedFieldCount: reader.getMatchedFieldCount(),
      unmappedEntries: reader.listUnmappedEntries(),
    };
  }

  private resolveRole(value: string): UserImportDraft["roleKey"] {
    const normalized = normalizeKey(value);
    if (normalized.includes("admin")) return "admin";
    if (normalized.includes("manager") || normalized.includes("gestor")) {
      return "manager";
    }
    if (normalized.includes("viewer") || normalized.includes("leitor")) {
      return "viewer";
    }
    return "member";
  }
}

class TaskImportDraftMapper implements ImportDraftMapper<TaskImportDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<TaskImportDraft> {
    const reader = new NormalizedRecordReader(record);
    const draft: TaskImportDraft = {
      title: reader.pick("title", "titulo", "task", "tarefa", "name", "nome"),
      description: reader.pick("description", "descricao", "detalhes"),
      status: this.resolveStatus(reader.pick("status", "estado", "situacao")),
      priority: this.resolvePriority(
        reader.pick("priority", "prioridade", "urgencia"),
      ),
      assigneeEmail: reader.pick(
        "assignee",
        "assignee_email",
        "responsavel",
        "responsavel_email",
      ),
      projectId: reader.pick(
        "project_id",
        "projectid",
        "projeto_id",
        "project",
        "projeto",
      ),
      milestoneId: reader.pick(
        "milestone_id",
        "milestoneid",
        "marco_id",
        "milestone",
        "marco",
      ),
      tags: reader.pick("tags", "tag", "etiquetas"),
      dueAt: reader.pick("due_at", "previsao", "due_date", "data_prevista"),
      deadlineAt: reader.pick("deadline_at", "entrega", "deadline", "prazo"),
    };
    return {
      draft,
      matchedFieldCount: reader.getMatchedFieldCount(),
      unmappedEntries: reader.listUnmappedEntries(),
    };
  }

  private resolveStatus(value: string): TaskImportDraft["status"] {
    const normalized = normalizeKey(value);
    if (
      normalized.includes("doing") ||
      normalized.includes("andamento") ||
      normalized.includes("progress")
    )
      return "doing";
    if (
      normalized.includes("done") ||
      normalized.includes("conclu") ||
      normalized.includes("finaliz")
    )
      return "done";
    if (normalized.includes("blocked") || normalized.includes("bloque"))
      return "blocked";
    return "todo";
  }

  private resolvePriority(value: string): TaskImportDraft["priority"] {
    const n = parseInt(normalizeKey(value), 10);
    if (n >= 1 && n <= 5) return n as TaskImportDraft["priority"];
    return 3;
  }
}

class LeadImportDraftMapper implements ImportDraftMapper<LeadImportDraft> {
  map(record: ImportRawRecord): ImportDraftMappingResult<LeadImportDraft> {
    const reader = new NormalizedRecordReader(record);
    const draft: LeadImportDraft = {
      name: reader.pick("name", "nome", "lead", "contato"),
      email: reader.pick("email", "e-mail", "mail"),
      phone: reader.pick("phone", "telefone", "tel"),
      company: reader.pick("company", "empresa", "organization", "organizacao"),
      status: this.resolveStatus(
        reader.pick("status", "estado", "situacao", "stage"),
      ),
      source: this.resolveSource(
        reader.pick("source", "origem", "canal", "channel"),
      ),
      assignedTo: reader.pick(
        "assigned_to",
        "responsavel",
        "assignee",
        "owner",
      ),
      estimatedValue: reader.pick(
        "estimated_value",
        "valor_estimado",
        "value",
        "valor",
      ),
      notes: reader.pick(
        "notes",
        "notas",
        "observacao",
        "observacoes",
        "comments",
      ),
      tags: reader.pick("tags", "tag", "etiquetas"),
    };
    return {
      draft,
      matchedFieldCount: reader.getMatchedFieldCount(),
      unmappedEntries: reader.listUnmappedEntries(),
    };
  }

  private resolveStatus(value: string): LeadImportDraft["status"] {
    const normalized = normalizeKey(value);
    if (normalized.includes("contact")) return "contacted";
    if (normalized.includes("qualif")) return "qualified";
    if (normalized.includes("propos")) return "proposal";
    if (normalized.includes("negoci") || normalized.includes("negoti"))
      return "negotiation";
    if (normalized.includes("won") || normalized.includes("ganh")) return "won";
    if (normalized.includes("lost") || normalized.includes("perd"))
      return "lost";
    return "new";
  }

  private resolveSource(value: string): LeadImportDraft["source"] {
    const normalized = normalizeKey(value);
    if (normalized.includes("website") || normalized.includes("site"))
      return "website";
    if (normalized.includes("referr") || normalized.includes("indica"))
      return "referral";
    if (normalized.includes("social")) return "social";
    if (normalized.includes("email") || normalized.includes("campan"))
      return "email_campaign";
    if (normalized.includes("cold") || normalized.includes("fria"))
      return "cold_call";
    if (normalized.includes("event") || normalized.includes("evento"))
      return "event";
    if (normalized.includes("partner") || normalized.includes("parceir"))
      return "partner";
    return "other";
  }
}

export class ImportDraftMapperRegistry {
  private readonly mapperByKind: ImportDraftMapperByKind = {
    clients: new ClientImportDraftMapper(),
    projects: new ProjectImportDraftMapper(),
    users: new UserImportDraftMapper(),
    tasks: new TaskImportDraftMapper(),
    leads: new LeadImportDraftMapper(),
  };

  resolve<TKind extends ImportEntityKind>(
    kind: TKind,
  ): ImportDraftMapper<ImportDraftByKind[TKind]> {
    return this.mapperByKind[kind];
  }
}
