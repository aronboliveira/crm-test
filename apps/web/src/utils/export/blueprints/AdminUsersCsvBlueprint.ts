import type { SelectableCsvColumnBlueprint } from "./SelectableCsvBlueprint";
import { SelectableCsvBlueprint } from "./SelectableCsvBlueprint";

export type AdminUsersExportColumnKey =
  | "nome"
  | "email"
  | "perfil"
  | "tokenVersion"
  | "senhaAtualizada"
  | "criadoEm"
  | "bloqueado";

export type AdminUsersExportRow = {
  nome: string;
  email: string;
  perfil: string;
  tokenVersion: number | string;
  senhaAtualizada: string;
  criadoEm: string;
  bloqueado: string;
};

type AdminUsersHeaderOverrides = Partial<Record<AdminUsersExportColumnKey, string>>;

export type AdminUsersExportColumnOption = Readonly<{
  key: AdminUsersExportColumnKey;
  label: string;
}>;

export const ADMIN_USERS_EXPORT_COLUMN_KEYS: readonly AdminUsersExportColumnKey[] = [
  "nome",
  "email",
  "perfil",
  "tokenVersion",
  "senhaAtualizada",
  "criadoEm",
  "bloqueado",
] as const;

export const ADMIN_USERS_EXPORT_COLUMNS: readonly AdminUsersExportColumnOption[] = [
  { key: "nome", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "perfil", label: "Perfil" },
  { key: "tokenVersion", label: "Token v." },
  { key: "senhaAtualizada", label: "Senha atualizada" },
  { key: "criadoEm", label: "Criado em" },
  { key: "bloqueado", label: "Bloqueado" },
] as const;

export const ADMIN_USERS_EXPORT_COLUMN_WIDTHS: Readonly<
  Record<AdminUsersExportColumnKey, number>
> = {
  nome: 30,
  email: 34,
  perfil: 18,
  tokenVersion: 12,
  senhaAtualizada: 24,
  criadoEm: 24,
  bloqueado: 12,
};

export const ADMIN_USERS_EXPORT_CENTERED_COLUMNS: readonly AdminUsersExportColumnKey[] =
  ["perfil", "tokenVersion", "bloqueado"] as const;

type AdminUsersCsvBlueprintOptions = {
  headers?: AdminUsersHeaderOverrides;
  columns?: readonly AdminUsersExportColumnKey[];
};

export class AdminUsersCsvBlueprint extends SelectableCsvBlueprint<
  AdminUsersExportRow,
  AdminUsersExportColumnKey
> {
  public constructor(options: AdminUsersCsvBlueprintOptions = {}) {
    const headers = options.headers ?? {};

    const allColumns: readonly SelectableCsvColumnBlueprint<
      AdminUsersExportRow,
      AdminUsersExportColumnKey
    >[] = [
      { key: "nome", header: headers.nome ?? "Nome", resolve: (row) => row.nome },
      {
        key: "email",
        header: headers.email ?? "E-mail",
        resolve: (row) => row.email,
      },
      {
        key: "perfil",
        header: headers.perfil ?? "Perfil",
        resolve: (row) => row.perfil,
      },
      {
        key: "tokenVersion",
        header: headers.tokenVersion ?? "Token v.",
        resolve: (row) => row.tokenVersion,
      },
      {
        key: "senhaAtualizada",
        header: headers.senhaAtualizada ?? "Senha atualizada",
        resolve: (row) => row.senhaAtualizada,
      },
      {
        key: "criadoEm",
        header: headers.criadoEm ?? "Criado em",
        resolve: (row) => row.criadoEm,
      },
      {
        key: "bloqueado",
        header: headers.bloqueado ?? "Bloqueado",
        resolve: (row) => row.bloqueado,
      },
    ];

    super(allColumns, ADMIN_USERS_EXPORT_COLUMN_KEYS, options);
  }
}
