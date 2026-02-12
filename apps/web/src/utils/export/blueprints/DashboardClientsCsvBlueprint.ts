import { CsvBlueprintBase } from "../csv/CsvBlueprintBase";
import type { CsvColumnBlueprint } from "../csv/CsvTypes";

export type DashboardClientsExportColumnKey =
  | "nome"
  | "tipo"
  | "empresa"
  | "cnpj"
  | "cep"
  | "lifecycle"
  | "email"
  | "telefone"
  | "whatsapp"
  | "whatsappEngagement"
  | "emailEngagement"
  | "projetos";

export type DashboardClientsExportRow = {
  nome: string;
  tipo: string;
  empresa: string;
  cnpj: string;
  cep: string;
  lifecycle: string;
  email: string;
  telefone: string;
  whatsapp: string;
  whatsappEngagement: number;
  emailEngagement: number;
  projetos: number;
};

type DashboardClientsHeaderOverrides = Partial<
  Record<DashboardClientsExportColumnKey, string>
>;

export const DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS: readonly DashboardClientsExportColumnKey[] =
  [
    "nome",
    "tipo",
    "empresa",
    "cnpj",
    "cep",
    "lifecycle",
    "email",
    "telefone",
    "whatsapp",
    "whatsappEngagement",
    "emailEngagement",
    "projetos",
  ] as const;

type DashboardClientsCsvBlueprintOptions = {
  headers?: DashboardClientsHeaderOverrides;
  columns?: readonly DashboardClientsExportColumnKey[];
};

export class DashboardClientsCsvBlueprint extends CsvBlueprintBase<DashboardClientsExportRow> {
  protected readonly columns: readonly CsvColumnBlueprint<DashboardClientsExportRow>[];

  public constructor(options: DashboardClientsCsvBlueprintOptions = {}) {
    super();
    const headers = options.headers ?? {};
    const selectedColumns = new Set(
      options.columns ?? DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS,
    );

    const allColumns: CsvColumnBlueprint<DashboardClientsExportRow>[] = [
      { key: "nome", header: headers.nome ?? "Nome", resolve: (row) => row.nome },
      {
        key: "tipo",
        header: headers.tipo ?? "Tipo",
        resolve: (row) => row.tipo,
      },
      {
        key: "empresa",
        header: headers.empresa ?? "Empresa",
        resolve: (row) => row.empresa,
      },
      {
        key: "cnpj",
        header: headers.cnpj ?? "CNPJ",
        resolve: (row) => row.cnpj,
      },
      {
        key: "cep",
        header: headers.cep ?? "CEP",
        resolve: (row) => row.cep,
      },
      {
        key: "lifecycle",
        header: headers.lifecycle ?? "Lifecycle",
        resolve: (row) => row.lifecycle,
      },
      { key: "email", header: headers.email ?? "Email", resolve: (row) => row.email },
      {
        key: "telefone",
        header: headers.telefone ?? "Telefone",
        resolve: (row) => row.telefone,
      },
      {
        key: "whatsapp",
        header: headers.whatsapp ?? "WhatsApp",
        resolve: (row) => row.whatsapp,
      },
      {
        key: "whatsappEngagement",
        header: headers.whatsappEngagement ?? "Engaj. WhatsApp (%)",
        resolve: (row) => row.whatsappEngagement,
      },
      {
        key: "emailEngagement",
        header: headers.emailEngagement ?? "Engaj. E-mail (%)",
        resolve: (row) => row.emailEngagement,
      },
      {
        key: "projetos",
        header: headers.projetos ?? "Projetos",
        resolve: (row) => row.projetos,
      },
    ];

    this.columns = allColumns.filter((column) =>
      selectedColumns.has(column.key as DashboardClientsExportColumnKey),
    );
  }

  public getColumnKeys(): DashboardClientsExportColumnKey[] {
    return this.columns.map(
      (column) => column.key as DashboardClientsExportColumnKey,
    );
  }
}
