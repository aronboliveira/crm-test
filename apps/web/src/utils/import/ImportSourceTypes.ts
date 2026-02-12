export type ImportSourceFormat = "csv" | "json" | "xml" | "pdf";

export type ImportRawRecord = Readonly<Record<string, string>>;

export type ImportSourceFileLike = Readonly<{
  name: string;
  type?: string;
  text: () => Promise<string>;
}>;

export type ParsedImportDocument = Readonly<{
  format: ImportSourceFormat;
  rows: readonly ImportRawRecord[];
  warnings: readonly string[];
  rowNumberOffset: number;
}>;
