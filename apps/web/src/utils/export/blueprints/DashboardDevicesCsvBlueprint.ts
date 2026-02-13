import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type DashboardDevicesExportColumnKey =
  | "nome"
  | "tipo"
  | "status"
  | "fabricante"
  | "modelo"
  | "sistemaOperacional"
  | "host"
  | "ip"
  | "serial"
  | "tags"
  | "ultimaAtividade";

export type DashboardDevicesExportRow = {
  nome: string;
  tipo: string;
  status: string;
  fabricante: string;
  modelo: string;
  sistemaOperacional: string;
  host: string;
  ip: string;
  serial: string;
  tags: string;
  ultimaAtividade: string;
};

type DashboardDevicesHeaderOverrides = Partial<
  Record<DashboardDevicesExportColumnKey, string>
>;

export type DashboardDevicesExportColumnOption = Readonly<{
  key: DashboardDevicesExportColumnKey;
  label: string;
}>;

export const DASHBOARD_DEVICES_EXPORT_COLUMN_KEYS: readonly DashboardDevicesExportColumnKey[] =
  [
    "nome",
    "tipo",
    "status",
    "fabricante",
    "modelo",
    "sistemaOperacional",
    "host",
    "ip",
    "serial",
    "tags",
    "ultimaAtividade",
  ] as const;

export const DASHBOARD_DEVICES_EXPORT_COLUMNS: readonly DashboardDevicesExportColumnOption[] =
  [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "fabricante", label: "Fabricante" },
    { key: "modelo", label: "Modelo" },
    { key: "sistemaOperacional", label: "Sistema Operacional" },
    { key: "host", label: "Host" },
    { key: "ip", label: "IP" },
    { key: "serial", label: "Serial" },
    { key: "tags", label: "Tags" },
    { key: "ultimaAtividade", label: "Última Atividade" },
  ] as const;

export const DASHBOARD_DEVICES_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<DashboardDevicesExportColumnKey, number>
> = {
  nome: 32,
  tipo: 14,
  status: 14,
  fabricante: 18,
  modelo: 24,
  sistemaOperacional: 24,
  host: 18,
  ip: 18,
  serial: 20,
  tags: 30,
  ultimaAtividade: 22,
};

export const DASHBOARD_DEVICES_EXPORT_CENTERED_COLUMNS: readonly DashboardDevicesExportColumnKey[] =
  ["tipo", "status"] as const;

type DashboardDevicesCsvBlueprintOptions = {
  headers?: DashboardDevicesHeaderOverrides;
  columns?: readonly DashboardDevicesExportColumnKey[];
};

export class DashboardDevicesCsvBlueprint extends SelectableCsvBlueprint<
  DashboardDevicesExportRow,
  DashboardDevicesExportColumnKey
> {
  public constructor(options: DashboardDevicesCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      DashboardDevicesExportRow,
      DashboardDevicesExportColumnKey
    >[] = [
      { key: "nome", header: headers.nome ?? "Nome", resolve: (row) => row.nome },
      { key: "tipo", header: headers.tipo ?? "Tipo", resolve: (row) => row.tipo },
      {
        key: "status",
        header: headers.status ?? "Status",
        resolve: (row) => row.status,
      },
      {
        key: "fabricante",
        header: headers.fabricante ?? "Fabricante",
        resolve: (row) => row.fabricante,
      },
      {
        key: "modelo",
        header: headers.modelo ?? "Modelo",
        resolve: (row) => row.modelo,
      },
      {
        key: "sistemaOperacional",
        header: headers.sistemaOperacional ?? "Sistema Operacional",
        resolve: (row) => row.sistemaOperacional,
      },
      { key: "host", header: headers.host ?? "Host", resolve: (row) => row.host },
      { key: "ip", header: headers.ip ?? "IP", resolve: (row) => row.ip },
      { key: "serial", header: headers.serial ?? "Serial", resolve: (row) => row.serial },
      { key: "tags", header: headers.tags ?? "Tags", resolve: (row) => row.tags },
      {
        key: "ultimaAtividade",
        header: headers.ultimaAtividade ?? "Última Atividade",
        resolve: (row) => row.ultimaAtividade,
      },
    ];

    super(allColumns, DASHBOARD_DEVICES_EXPORT_COLUMN_KEYS, options);
  }
}
