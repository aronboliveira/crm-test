import type { ImportBlueprint } from "./ImportBlueprint";
import type { ImportColumnMapping } from "./ImportColumnMappingResolver";
import {
  ImportDraftMapperRegistry,
  type ImportUnmappedEntry,
} from "./ImportDraftMappers";
import type {
  ImportRawRecord,
  ImportSourceFileLike,
  ImportSourceFormat,
  ParsedImportDocument,
} from "./ImportSourceTypes";
import type { ImportEntityKind } from "./ImportTypes";
import { ImportDocumentParserRegistry } from "./parsers/ImportDocumentParserRegistry";
import {
  BrowserImportSourceFileTextReader,
  type ImportSourceFileTextReader,
} from "./parsers/ImportSourceFileTextReader";

type ImportIngestionServiceOptions = Readonly<{
  fileTextReader?: ImportSourceFileTextReader;
  parserRegistry?: ImportDocumentParserRegistry;
  draftMapperRegistry?: ImportDraftMapperRegistry;
}>;

export type ImportIngestionRejectedRow = Readonly<{
  rowNumber: number;
  reason: string;
  rawRecord: ImportRawRecord;
  fieldErrors: Readonly<Record<string, string>>;
}>;

export type ImportIngestionAcceptedRow<TPayload extends Record<string, unknown>> = Readonly<{
  rowNumber: number;
  payload: TPayload;
  summary: string;
}>;

export type ImportIngestionResult<TPayload extends Record<string, unknown>> = Readonly<{
  format: ImportSourceFormat;
  totalRows: number;
  accepted: readonly ImportIngestionAcceptedRow<TPayload>[];
  rejected: readonly ImportIngestionRejectedRow[];
  warnings: readonly string[];
}>;

export type ImportSourceAnalysisResult = Readonly<{
  format: ImportSourceFormat;
  totalRows: number;
  columns: readonly string[];
  warnings: readonly string[];
}>;

type ImportIngestionOptions = Readonly<{
  columnMapping?: ImportColumnMapping;
  defaultValues?: Readonly<Record<string, string>>;
}>;

export class ImportSourceIngestionService {
  private readonly fileTextReader: ImportSourceFileTextReader;
  private readonly parserRegistry: ImportDocumentParserRegistry;
  private readonly draftMapperRegistry: ImportDraftMapperRegistry;

  constructor(options: ImportIngestionServiceOptions = {}) {
    this.fileTextReader =
      options.fileTextReader ?? new BrowserImportSourceFileTextReader();
    this.parserRegistry =
      options.parserRegistry ?? new ImportDocumentParserRegistry();
    this.draftMapperRegistry =
      options.draftMapperRegistry ?? new ImportDraftMapperRegistry();
  }

  async ingest(
    kind: ImportEntityKind,
    file: ImportSourceFileLike,
    blueprint: ImportBlueprint<Record<string, unknown>, Record<string, unknown>>,
    options: ImportIngestionOptions = {},
  ): Promise<ImportIngestionResult<Record<string, unknown>>> {
    const parsedDocument = await this.parseSourceFile(file);
    const mapper = this.resolveMapper(kind);

    const accepted: Array<ImportIngestionAcceptedRow<Record<string, unknown>>> = [];
    const rejected: ImportIngestionRejectedRow[] = [];

    for (let index = 0; index < parsedDocument.rows.length; index += 1) {
      const rawRecord = parsedDocument.rows[index];
      const rowNumber = parsedDocument.rowNumberOffset + index;
      if (!rawRecord) continue;
      const mappedRecord = this.applyColumnMapping(rawRecord, options.columnMapping);
      const completedRecord = this.applyDefaultValues(
        mappedRecord,
        options.defaultValues,
      );
      const mapping = mapper.map(completedRecord);
      const draftWithNotes = this.appendUnmappedEntriesToNotes(
        mapping.draft as Record<string, unknown>,
        mapping.unmappedEntries,
      );

      if (mapping.matchedFieldCount === 0) {
        rejected.push({
          rowNumber,
          reason: "Nenhuma coluna reconhecida para este tipo de importação.",
          rawRecord,
          fieldErrors: {},
        });
        continue;
      }

      const validation = await blueprint.validateDraft(
        draftWithNotes,
      );
      const fieldErrors = this.normalizeFieldErrors(validation.errors);
      if (!validation.valid) {
        rejected.push({
          rowNumber,
          reason: "Dados inválidos para importação.",
          rawRecord,
          fieldErrors,
        });
        continue;
      }

      const payload = blueprint.toPayload(draftWithNotes);
      accepted.push({
        rowNumber,
        payload,
        summary: blueprint.summarize(payload),
      });
    }

    const warnings: string[] = [...parsedDocument.warnings];
    if (parsedDocument.rows.length === 0) {
      warnings.push("Nenhuma linha foi encontrada no arquivo enviado.");
    }

    return {
      format: parsedDocument.format,
      totalRows: parsedDocument.rows.length,
      accepted,
      rejected,
      warnings,
    };
  }

  async analyze(file: ImportSourceFileLike): Promise<ImportSourceAnalysisResult> {
    const parsedDocument = await this.parseSourceFile(file);
    return {
      format: parsedDocument.format,
      totalRows: parsedDocument.rows.length,
      columns: this.collectColumns(parsedDocument.rows),
      warnings: [...parsedDocument.warnings],
    };
  }

  private normalizeFieldErrors(
    rawErrors: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, string>> {
    return Object.entries(rawErrors).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (typeof value !== "string" || !value) return accumulator;
        accumulator[key] = value;
        return accumulator;
      },
      {},
    );
  }

  private resolveMapper(kind: ImportEntityKind) {
    if (kind === "clients") {
      return this.draftMapperRegistry.resolve("clients");
    }
    if (kind === "projects") {
      return this.draftMapperRegistry.resolve("projects");
    }
    return this.draftMapperRegistry.resolve("users");
  }

  private async parseSourceFile(
    file: ImportSourceFileLike,
  ): Promise<ParsedImportDocument> {
    const parser = this.parserRegistry.resolve(file);
    const content = await this.fileTextReader.read(file);
    return parser.parse(content);
  }

  private collectColumns(rows: readonly ImportRawRecord[]): string[] {
    const columns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key) columns.add(key);
      });
    });
    return Array.from(columns);
  }

  private applyColumnMapping(
    rawRecord: ImportRawRecord,
    columnMapping: ImportColumnMapping | undefined,
  ): ImportRawRecord {
    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      return rawRecord;
    }

    const mappedRecord: Record<string, string> = { ...rawRecord };
    Object.entries(columnMapping).forEach(([targetKey, sourceKey]) => {
      if (!targetKey || !sourceKey) return;
      mappedRecord[targetKey] = String(rawRecord[sourceKey] ?? "").trim();
    });
    return mappedRecord;
  }

  private applyDefaultValues(
    rawRecord: ImportRawRecord,
    defaultValues: Readonly<Record<string, string>> | undefined,
  ): ImportRawRecord {
    if (!defaultValues || Object.keys(defaultValues).length === 0) {
      return rawRecord;
    }

    const completed: Record<string, string> = { ...rawRecord };
    Object.entries(defaultValues).forEach(([key, value]) => {
      if (!key) return;
      const normalizedValue = String(value ?? "").trim();
      if (!normalizedValue) return;
      const current = String(completed[key] ?? "").trim();
      if (!current) {
        completed[key] = normalizedValue;
      }
    });
    return completed;
  }

  private appendUnmappedEntriesToNotes(
    draft: Readonly<Record<string, unknown>>,
    unmappedEntries: readonly ImportUnmappedEntry[],
  ): Record<string, unknown> {
    if (!Object.prototype.hasOwnProperty.call(draft, "notes")) {
      return { ...draft };
    }
    const normalizedEntries = unmappedEntries
      .map((entry) => ({
        key: String(entry.key ?? "").trim(),
        value: String(entry.value ?? "").trim(),
      }))
      .filter((entry) => entry.key && entry.value)
      .slice(0, 8);
    if (normalizedEntries.length === 0) {
      return { ...draft };
    }

    const extras = normalizedEntries
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join(" | ");
    const currentNotes = String(draft.notes ?? "").trim();
    const appended = currentNotes
      ? `${currentNotes}\nCampos extras: ${extras}`
      : `Campos extras: ${extras}`;

    return {
      ...draft,
      notes: appended.slice(0, 1200),
    };
  }
}
