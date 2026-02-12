import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type AdminAuditExportColumnKey =
  | "data"
  | "tipo"
  | "ator"
  | "alvo"
  | "meta";

export type AdminAuditExportRow = {
  data: string;
  tipo: string;
  ator: string;
  alvo: string;
  meta: string;
};

type AdminAuditHeaderOverrides = Partial<Record<AdminAuditExportColumnKey, string>>;

export type AdminAuditExportColumnOption = Readonly<{
  key: AdminAuditExportColumnKey;
  label: string;
}>;

export const ADMIN_AUDIT_EXPORT_COLUMN_KEYS: readonly AdminAuditExportColumnKey[] = [
  "data",
  "tipo",
  "ator",
  "alvo",
  "meta",
] as const;

export const ADMIN_AUDIT_EXPORT_COLUMNS: readonly AdminAuditExportColumnOption[] = [
  { key: "data", label: "Data" },
  { key: "tipo", label: "Tipo" },
  { key: "ator", label: "Ator" },
  { key: "alvo", label: "Alvo" },
  { key: "meta", label: "Meta" },
] as const;

export const ADMIN_AUDIT_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<AdminAuditExportColumnKey, number>
> = {
  data: 24,
  tipo: 32,
  ator: 34,
  alvo: 34,
  meta: 60,
};

export const ADMIN_AUDIT_EXPORT_CENTERED_COLUMNS: readonly AdminAuditExportColumnKey[] =
  ["data"] as const;

type AdminAuditCsvBlueprintOptions = {
  headers?: AdminAuditHeaderOverrides;
  columns?: readonly AdminAuditExportColumnKey[];
};

export class AdminAuditCsvBlueprint extends SelectableCsvBlueprint<
  AdminAuditExportRow,
  AdminAuditExportColumnKey
> {
  public constructor(options: AdminAuditCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      AdminAuditExportRow,
      AdminAuditExportColumnKey
    >[] = [
      { key: "data", header: headers.data ?? "Data", resolve: (row) => row.data },
      { key: "tipo", header: headers.tipo ?? "Tipo", resolve: (row) => row.tipo },
      { key: "ator", header: headers.ator ?? "Ator", resolve: (row) => row.ator },
      { key: "alvo", header: headers.alvo ?? "Alvo", resolve: (row) => row.alvo },
      { key: "meta", header: headers.meta ?? "Meta", resolve: (row) => row.meta },
    ];

    super(allColumns, ADMIN_AUDIT_EXPORT_COLUMN_KEYS, options);
  }
}
