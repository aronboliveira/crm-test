import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type DashboardReportsExportColumnKey =
  | "tipo"
  | "codigo"
  | "item"
  | "status"
  | "responsavel"
  | "prioridade"
  | "entrega"
  | "tarefas"
  | "progresso";

export type DashboardReportsExportRow = {
  tipo: string;
  codigo: string;
  item: string;
  status: string;
  responsavel: string;
  prioridade: string;
  entrega: string;
  tarefas: number | "";
  progresso: string;
};

type DashboardReportsHeaderOverrides = Partial<
  Record<DashboardReportsExportColumnKey, string>
>;

export type DashboardReportsExportColumnOption = Readonly<{
  key: DashboardReportsExportColumnKey;
  label: string;
}>;

export const DASHBOARD_REPORTS_EXPORT_COLUMN_KEYS: readonly DashboardReportsExportColumnKey[] =
  [
    "tipo",
    "codigo",
    "item",
    "status",
    "responsavel",
    "prioridade",
    "entrega",
    "tarefas",
    "progresso",
  ] as const;

export const DASHBOARD_REPORTS_EXPORT_COLUMNS: readonly DashboardReportsExportColumnOption[] =
  [
    { key: "tipo", label: "Tipo" },
    { key: "codigo", label: "Código" },
    { key: "item", label: "Item" },
    { key: "status", label: "Status" },
    { key: "responsavel", label: "Responsável" },
    { key: "prioridade", label: "Prioridade" },
    { key: "entrega", label: "Entrega" },
    { key: "tarefas", label: "Tarefas" },
    { key: "progresso", label: "Progresso" },
  ] as const;

export const DASHBOARD_REPORTS_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<DashboardReportsExportColumnKey, number>
> = {
  tipo: 12,
  codigo: 16,
  item: 34,
  status: 14,
  responsavel: 30,
  prioridade: 14,
  entrega: 14,
  tarefas: 12,
  progresso: 14,
};

export const DASHBOARD_REPORTS_EXPORT_CENTERED_COLUMNS: readonly DashboardReportsExportColumnKey[] =
  ["tipo", "status", "prioridade", "entrega", "tarefas", "progresso"] as const;

type DashboardReportsCsvBlueprintOptions = {
  headers?: DashboardReportsHeaderOverrides;
  columns?: readonly DashboardReportsExportColumnKey[];
};

export class DashboardReportsCsvBlueprint extends SelectableCsvBlueprint<
  DashboardReportsExportRow,
  DashboardReportsExportColumnKey
> {
  public constructor(options: DashboardReportsCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      DashboardReportsExportRow,
      DashboardReportsExportColumnKey
    >[] = [
      {
        key: "tipo",
        header: headers.tipo ?? "Tipo",
        resolve: (row) => row.tipo,
      },
      {
        key: "codigo",
        header: headers.codigo ?? "Código",
        resolve: (row) => row.codigo,
      },
      {
        key: "item",
        header: headers.item ?? "Item",
        resolve: (row) => row.item,
      },
      {
        key: "status",
        header: headers.status ?? "Status",
        resolve: (row) => row.status,
      },
      {
        key: "responsavel",
        header: headers.responsavel ?? "Responsável",
        resolve: (row) => row.responsavel,
      },
      {
        key: "prioridade",
        header: headers.prioridade ?? "Prioridade",
        resolve: (row) => row.prioridade,
      },
      {
        key: "entrega",
        header: headers.entrega ?? "Entrega",
        resolve: (row) => row.entrega,
      },
      {
        key: "tarefas",
        header: headers.tarefas ?? "Tarefas",
        resolve: (row) => row.tarefas,
      },
      {
        key: "progresso",
        header: headers.progresso ?? "Progresso",
        resolve: (row) => row.progresso,
      },
    ];

    super(allColumns, DASHBOARD_REPORTS_EXPORT_COLUMN_KEYS, options);
  }
}
