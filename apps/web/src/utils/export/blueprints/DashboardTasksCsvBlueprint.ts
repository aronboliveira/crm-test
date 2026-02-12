import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type DashboardTasksExportColumnKey =
  | "titulo"
  | "projeto"
  | "responsavel"
  | "status"
  | "prioridade"
  | "tags"
  | "entrega";

export type DashboardTasksExportRow = {
  titulo: string;
  projeto: string;
  responsavel: string;
  status: string;
  prioridade: string;
  tags: string;
  entrega: string;
};

type DashboardTasksHeaderOverrides = Partial<
  Record<DashboardTasksExportColumnKey, string>
>;

export type DashboardTasksExportColumnOption = Readonly<{
  key: DashboardTasksExportColumnKey;
  label: string;
}>;

export const DASHBOARD_TASKS_EXPORT_COLUMN_KEYS: readonly DashboardTasksExportColumnKey[] =
  [
    "titulo",
    "projeto",
    "responsavel",
    "status",
    "prioridade",
    "tags",
    "entrega",
  ] as const;

export const DASHBOARD_TASKS_EXPORT_COLUMNS: readonly DashboardTasksExportColumnOption[] =
  [
    { key: "titulo", label: "Título" },
    { key: "projeto", label: "Projeto" },
    { key: "responsavel", label: "Responsável" },
    { key: "status", label: "Status" },
    { key: "prioridade", label: "Prioridade" },
    { key: "tags", label: "Tags" },
    { key: "entrega", label: "Entrega" },
  ] as const;

export const DASHBOARD_TASKS_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<DashboardTasksExportColumnKey, number>
> = {
  titulo: 34,
  projeto: 24,
  responsavel: 30,
  status: 14,
  prioridade: 12,
  tags: 26,
  entrega: 14,
};

export const DASHBOARD_TASKS_EXPORT_CENTERED_COLUMNS: readonly DashboardTasksExportColumnKey[] =
  ["status", "prioridade", "entrega"] as const;

type DashboardTasksCsvBlueprintOptions = {
  headers?: DashboardTasksHeaderOverrides;
  columns?: readonly DashboardTasksExportColumnKey[];
};

export class DashboardTasksCsvBlueprint extends SelectableCsvBlueprint<
  DashboardTasksExportRow,
  DashboardTasksExportColumnKey
> {
  public constructor(options: DashboardTasksCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      DashboardTasksExportRow,
      DashboardTasksExportColumnKey
    >[] = [
      {
        key: "titulo",
        header: headers.titulo ?? "Título",
        resolve: (row) => row.titulo,
      },
      {
        key: "projeto",
        header: headers.projeto ?? "Projeto",
        resolve: (row) => row.projeto,
      },
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
      {
        key: "prioridade",
        header: headers.prioridade ?? "Prioridade",
        resolve: (row) => row.prioridade,
      },
      { key: "tags", header: headers.tags ?? "Tags", resolve: (row) => row.tags },
      {
        key: "entrega",
        header: headers.entrega ?? "Entrega",
        resolve: (row) => row.entrega,
      },
    ];

    super(allColumns, DASHBOARD_TASKS_EXPORT_COLUMN_KEYS, options);
  }
}
