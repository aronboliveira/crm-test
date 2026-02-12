import type { ImportFieldDefinition } from "./ImportFieldCatalog";

export type ImportColumnMapping = Readonly<Record<string, string>>;

const normalizeKey = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export class ImportColumnMappingResolver {
  suggest(
    sourceColumns: readonly string[],
    targetFields: readonly ImportFieldDefinition[],
  ): ImportColumnMapping {
    const normalizedSourceColumns = sourceColumns.map((column) => ({
      original: column,
      normalized: normalizeKey(column),
    }));

    return targetFields.reduce<Record<string, string>>((mapping, field) => {
      const normalizedAliases = [field.key, ...field.aliases].map((alias) =>
        normalizeKey(alias),
      );
      const match = normalizedSourceColumns.find((column) =>
        normalizedAliases.includes(column.normalized),
      );
      mapping[field.key] = match?.original ?? "";
      return mapping;
    }, {});
  }
}
