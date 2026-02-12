import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type DashboardProjectsExportColumnKey =
  | "codigo"
  | "nome"
  | "responsavel"
  | "status"
  | "tags"
  | "prazo"
  | "entrega";

export type DashboardProjectsExportRow = {
  codigo: string;
  nome: string;
  responsavel: string;
  status: string;
  tags: string;
  prazo: string;
  entrega: string;
};

type DashboardProjectsHeaderOverrides = Partial<
  Record<DashboardProjectsExportColumnKey, string>
>;

export type DashboardProjectsExportColumnOption = Readonly<{
  key: DashboardProjectsExportColumnKey;
  label: string;
}>;

export const DASHBOARD_PROJECTS_EXPORT_COLUMN_KEYS: readonly DashboardProjectsExportColumnKey[] =
  [
    "codigo",
    "nome",
    "responsavel",
    "status",
    "tags",
    "prazo",
    "entrega",
  ] as const;

export const DASHBOARD_PROJECTS_EXPORT_COLUMNS: readonly DashboardProjectsExportColumnOption[] =
  [
    { key: "codigo", label: "Código" },
    { key: "nome", label: "Nome" },
    { key: "responsavel", label: "Responsável" },
    { key: "status", label: "Status" },
    { key: "tags", label: "Tags" },
    { key: "prazo", label: "Prazo" },
    { key: "entrega", label: "Entrega" },
  ] as const;

export const DASHBOARD_PROJECTS_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<DashboardProjectsExportColumnKey, number>
> = {
  codigo: 16,
  nome: 30,
  responsavel: 30,
  status: 14,
  tags: 24,
  prazo: 14,
  entrega: 14,
};

export const DASHBOARD_PROJECTS_EXPORT_CENTERED_COLUMNS: readonly DashboardProjectsExportColumnKey[] =
  ["status", "prazo", "entrega"] as const;

type DashboardProjectsCsvBlueprintOptions = {
  headers?: DashboardProjectsHeaderOverrides;
  columns?: readonly DashboardProjectsExportColumnKey[];
};

export class DashboardProjectsCsvBlueprint extends SelectableCsvBlueprint<
  DashboardProjectsExportRow,
  DashboardProjectsExportColumnKey
> {
  public constructor(options: DashboardProjectsCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      DashboardProjectsExportRow,
      DashboardProjectsExportColumnKey
    >[] = [
      {
        key: "codigo",
        header: headers.codigo ?? "Código",
        resolve: (row) => row.codigo,
      },
      { key: "nome", header: headers.nome ?? "Nome", resolve: (row) => row.nome },
      {
        key: "responsavel",
        header: headers.responsavel ?? "Responsável",
        resolve: (row) => row.responsavel,
      },
      {
        key: "status",
        header: headers.status ?? "Status",
        resolve: (row) => row.status,
      },
      { key: "tags", header: headers.tags ?? "Tags", resolve: (row) => row.tags },
      {
        key: "prazo",
        header: headers.prazo ?? "Prazo",
        resolve: (row) => row.prazo,
      },
      {
        key: "entrega",
        header: headers.entrega ?? "Entrega",
        resolve: (row) => row.entrega,
      },
    ];

    super(allColumns, DASHBOARD_PROJECTS_EXPORT_COLUMN_KEYS, options);
  }
}
