import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type AdminMailOutboxExportColumnKey =
  | "data"
  | "para"
  | "tipo"
  | "assunto"
  | "texto"
  | "meta";

export type AdminMailOutboxExportRow = {
  data: string;
  para: string;
  tipo: string;
  assunto: string;
  texto: string;
  meta: string;
};

type AdminMailOutboxHeaderOverrides = Partial<
  Record<AdminMailOutboxExportColumnKey, string>
>;

export type AdminMailOutboxExportColumnOption = Readonly<{
  key: AdminMailOutboxExportColumnKey;
  label: string;
}>;

export const ADMIN_MAIL_OUTBOX_EXPORT_COLUMN_KEYS: readonly AdminMailOutboxExportColumnKey[] =
  ["data", "para", "tipo", "assunto", "texto", "meta"] as const;

export const ADMIN_MAIL_OUTBOX_EXPORT_COLUMNS: readonly AdminMailOutboxExportColumnOption[] =
  [
    { key: "data", label: "Data" },
    { key: "para", label: "Para" },
    { key: "tipo", label: "Tipo" },
    { key: "assunto", label: "Assunto" },
    { key: "texto", label: "Texto" },
    { key: "meta", label: "Meta" },
  ] as const;

export const ADMIN_MAIL_OUTBOX_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<AdminMailOutboxExportColumnKey, number>
> = {
  data: 24,
  para: 34,
  tipo: 18,
  assunto: 36,
  texto: 52,
  meta: 52,
};

export const ADMIN_MAIL_OUTBOX_EXPORT_CENTERED_COLUMNS: readonly AdminMailOutboxExportColumnKey[] =
  ["data", "tipo"] as const;

type AdminMailOutboxCsvBlueprintOptions = {
  headers?: AdminMailOutboxHeaderOverrides;
  columns?: readonly AdminMailOutboxExportColumnKey[];
};

export class AdminMailOutboxCsvBlueprint extends SelectableCsvBlueprint<
  AdminMailOutboxExportRow,
  AdminMailOutboxExportColumnKey
> {
  public constructor(options: AdminMailOutboxCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      AdminMailOutboxExportRow,
      AdminMailOutboxExportColumnKey
    >[] = [
      { key: "data", header: headers.data ?? "Data", resolve: (row) => row.data },
      { key: "para", header: headers.para ?? "Para", resolve: (row) => row.para },
      { key: "tipo", header: headers.tipo ?? "Tipo", resolve: (row) => row.tipo },
      {
        key: "assunto",
        header: headers.assunto ?? "Assunto",
        resolve: (row) => row.assunto,
      },
      {
        key: "texto",
        header: headers.texto ?? "Texto",
        resolve: (row) => row.texto,
      },
      { key: "meta", header: headers.meta ?? "Meta", resolve: (row) => row.meta },
    ];

    super(allColumns, ADMIN_MAIL_OUTBOX_EXPORT_COLUMN_KEYS, options);
  }
}
