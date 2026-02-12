import type { ImportEntityKind } from "./ImportTypes";

export type ImportFieldDefinition = Readonly<{
  key: string;
  label: string;
  required: boolean;
  aliases: readonly string[];
}>;

const CLIENT_FIELDS: readonly ImportFieldDefinition[] = [
  {
    key: "name",
    label: "Nome",
    required: true,
    aliases: ["name", "nome", "cliente", "client"],
  },
  {
    key: "type",
    label: "Tipo",
    required: true,
    aliases: ["type", "tipo", "client_type", "tipo_cliente"],
  },
  {
    key: "company",
    label: "Empresa",
    required: false,
    aliases: ["company", "empresa", "organization", "organizacao"],
  },
  {
    key: "cnpj",
    label: "CNPJ",
    required: false,
    aliases: ["cnpj", "documento", "document", "tax_id"],
  },
  {
    key: "cep",
    label: "CEP",
    required: false,
    aliases: ["cep", "postal_code", "zipcode", "zip"],
  },
  {
    key: "email",
    label: "E-mail",
    required: false,
    aliases: ["email", "e-mail", "mail"],
  },
  {
    key: "phone",
    label: "Telefone",
    required: false,
    aliases: ["phone", "telefone", "tel"],
  },
  {
    key: "cellPhone",
    label: "Celular",
    required: false,
    aliases: ["cellphone", "cell_phone", "cellPhone", "celular", "mobile"],
  },
  {
    key: "whatsappNumber",
    label: "WhatsApp",
    required: false,
    aliases: [
      "whatsapp",
      "whatsappnumber",
      "whatsapp_number",
      "numero_whatsapp",
      "wa_number",
    ],
  },
  {
    key: "preferredContact",
    label: "Contato preferido",
    required: false,
    aliases: ["preferred_contact", "preferredcontact", "contato_preferido"],
  },
  {
    key: "notes",
    label: "Notas",
    required: false,
    aliases: ["notes", "notas", "observacao", "observacoes", "comments"],
  },
];

const PROJECT_FIELDS: readonly ImportFieldDefinition[] = [
  {
    key: "name",
    label: "Nome do projeto",
    required: true,
    aliases: ["name", "nome", "project", "projeto"],
  },
  {
    key: "status",
    label: "Status",
    required: true,
    aliases: ["status", "estado", "situacao", "stage"],
  },
  {
    key: "code",
    label: "Código",
    required: false,
    aliases: ["code", "codigo", "project_code", "projectid"],
  },
  {
    key: "ownerEmail",
    label: "Responsável (e-mail)",
    required: false,
    aliases: ["owner_email", "owneremail", "responsavel_email", "owner"],
  },
  {
    key: "dueAt",
    label: "Previsão",
    required: false,
    aliases: ["due_at", "dueat", "previsao", "due_date"],
  },
  {
    key: "deadlineAt",
    label: "Entrega",
    required: false,
    aliases: ["deadline_at", "deadlineat", "entrega", "deadline"],
  },
  {
    key: "tags",
    label: "Tags",
    required: false,
    aliases: ["tags", "tag", "etiquetas"],
  },
  {
    key: "description",
    label: "Descrição",
    required: false,
    aliases: ["description", "descricao", "detalhes"],
  },
];

const USER_FIELDS: readonly ImportFieldDefinition[] = [
  {
    key: "email",
    label: "E-mail",
    required: true,
    aliases: ["email", "e-mail", "mail"],
  },
  {
    key: "roleKey",
    label: "Perfil",
    required: true,
    aliases: ["role", "role_key", "rolekey", "perfil", "nivel"],
  },
  {
    key: "firstName",
    label: "Nome",
    required: false,
    aliases: ["first_name", "firstname", "nome", "given_name"],
  },
  {
    key: "lastName",
    label: "Sobrenome",
    required: false,
    aliases: ["last_name", "lastname", "sobrenome", "family_name"],
  },
  {
    key: "phone",
    label: "Telefone",
    required: false,
    aliases: ["phone", "telefone", "tel"],
  },
  {
    key: "department",
    label: "Departamento",
    required: false,
    aliases: ["department", "departamento", "team", "equipe"],
  },
];

export class ImportFieldCatalog {
  get(kind: ImportEntityKind): readonly ImportFieldDefinition[] {
    if (kind === "clients") return CLIENT_FIELDS;
    if (kind === "projects") return PROJECT_FIELDS;
    return USER_FIELDS;
  }
}
