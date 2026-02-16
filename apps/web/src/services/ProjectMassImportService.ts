import { ImportDocumentParserRegistry } from "../utils/import/parsers/ImportDocumentParserRegistry";
import {
  ProjectImportBlueprint,
  type ProjectImportDraft,
  type ProjectImportPayload,
} from "../utils/import/blueprints/ProjectImportBlueprint";
import type {
  ParsedImportDocument,
  ImportRawRecord,
} from "../utils/import/ImportSourceTypes";
import ApiClientService from "./ApiClientService";

export type ProjectImportValidationError = Readonly<{
  row: number;
  field: string;
  message: string;
}>;

export type ProjectImportParsedRow = Readonly<{
  rowNumber: number;
  rawRecord: ImportRawRecord;
  draft: ProjectImportDraft;
  payload: ProjectImportPayload | null;
  errors: ReadonlyArray<{ field: string; message: string }>;
  isValid: boolean;
}>;

export type ProjectImportParseResult = Readonly<{
  format: string;
  totalRows: number;
  parsedRows: readonly ProjectImportParsedRow[];
  validCount: number;
  invalidCount: number;
  errors: readonly ProjectImportValidationError[];
  warnings: readonly string[];
}>;

export type ProjectImportSubmitResult = Readonly<{
  totalSubmitted: number;
  successCount: number;
  failedCount: number;
  errors: readonly ProjectImportValidationError[];
}>;

export interface ProjectImportProgressCallbacks {
  onReadStart?: () => void;
  onReadComplete?: (fileName: string) => void;
  onParseStart?: () => void;
  onParseComplete?: (rowCount: number) => void;
  onValidateStart?: (totalRows: number) => void;
  onValidateProgress?: (processed: number, total: number) => void;
  onValidateComplete?: (validCount: number, invalidCount: number) => void;
  onSubmitStart?: (totalRows: number) => void;
  onSubmitProgress?: (processed: number, total: number) => void;
  onSubmitComplete?: (successCount: number, failedCount: number) => void;
  onError?: (error: Error) => void;
}

const PROJECT_STATUS_SET = new Set<ProjectImportDraft["status"]>([
  "planned",
  "active",
  "blocked",
  "done",
  "archived",
]);

export default class ProjectMassImportService {
  private readonly parserRegistry: ImportDocumentParserRegistry;
  private readonly blueprint: ProjectImportBlueprint;

  constructor() {
    this.parserRegistry = new ImportDocumentParserRegistry();
    this.blueprint = new ProjectImportBlueprint();
  }

  async parseAndValidate(
    file: File,
    callbacks?: ProjectImportProgressCallbacks,
  ): Promise<ProjectImportParseResult> {
    callbacks?.onReadStart?.();
    let content: string;
    try {
      content = await this.readFileAsText(file);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw err;
    }
    callbacks?.onReadComplete?.(file.name);

    callbacks?.onParseStart?.();
    let parsed: ParsedImportDocument;
    try {
      const parser = this.parserRegistry.resolve({
        name: file.name,
        type: file.type,
      });
      parsed = parser.parse(content);
    } catch (error) {
      const err = this.wrapParseError(error);
      callbacks?.onError?.(err);
      throw err;
    }
    callbacks?.onParseComplete?.(parsed.rows.length);

    callbacks?.onValidateStart?.(parsed.rows.length);
    const parsedRows: ProjectImportParsedRow[] = [];
    const allErrors: ProjectImportValidationError[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const rawRecord = parsed.rows[i];
      if (!rawRecord) continue;

      const rowNumber = parsed.rowNumberOffset + i;
      const draft = this.mapRawToDraft(rawRecord);
      const validation = await this.blueprint.validateDraft(draft);

      const errors = Object.entries(validation.errors).map(
        ([field, message]) => ({
          field,
          message: message ?? "Erro de validação",
        }),
      );

      const isValid = errors.length === 0;
      const payload = isValid ? this.blueprint.toPayload(draft) : null;

      if (!isValid) {
        errors.forEach((error) => {
          allErrors.push({
            row: rowNumber,
            field: error.field,
            message: error.message,
          });
        });
      }

      parsedRows.push({
        rowNumber,
        rawRecord,
        draft,
        payload,
        errors,
        isValid,
      });

      callbacks?.onValidateProgress?.(i + 1, parsed.rows.length);
    }

    const validCount = parsedRows.filter((row) => row.isValid).length;
    const invalidCount = parsedRows.filter((row) => !row.isValid).length;
    callbacks?.onValidateComplete?.(validCount, invalidCount);

    return {
      format: parsed.format,
      totalRows: parsed.rows.length,
      parsedRows,
      validCount,
      invalidCount,
      errors: allErrors,
      warnings: parsed.warnings,
    };
  }

  async submitValidRows(
    parsedRows: readonly ProjectImportParsedRow[],
    callbacks?: ProjectImportProgressCallbacks,
  ): Promise<ProjectImportSubmitResult> {
    const validRows = parsedRows.filter((row) => row.isValid && row.payload);
    const totalSubmitted = validRows.length;

    if (!totalSubmitted) {
      return {
        totalSubmitted: 0,
        successCount: 0,
        failedCount: 0,
        errors: [],
      };
    }

    callbacks?.onSubmitStart?.(totalSubmitted);

    const errors: ProjectImportValidationError[] = [];
    let successCount = 0;
    let failedCount = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row) => {
          if (!row.payload) return;
          try {
            await ApiClientService.projects.create(row.payload);
            successCount++;
          } catch (error) {
            failedCount++;
            errors.push({
              row: row.rowNumber,
              field: "server",
              message:
                error instanceof Error
                  ? error.message
                  : "Falha ao criar projeto no servidor",
            });
          }
        }),
      );

      callbacks?.onSubmitProgress?.(
        Math.min(i + BATCH_SIZE, validRows.length),
        totalSubmitted,
      );

      if (i + BATCH_SIZE < validRows.length) {
        await this.delay(50);
      }
    }

    callbacks?.onSubmitComplete?.(successCount, failedCount);

    return {
      totalSubmitted,
      successCount,
      failedCount,
      errors,
    };
  }

  async parseForSingleProject(
    file: File,
    callbacks?: ProjectImportProgressCallbacks,
  ): Promise<ProjectImportDraft | null> {
    callbacks?.onReadStart?.();
    let content: string;
    try {
      content = await this.readFileAsText(file);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw err;
    }
    callbacks?.onReadComplete?.(file.name);

    callbacks?.onParseStart?.();
    let parsed: ParsedImportDocument;
    try {
      const parser = this.parserRegistry.resolve({
        name: file.name,
        type: file.type,
      });
      parsed = parser.parse(content);
    } catch (error) {
      const err = this.wrapParseError(error);
      callbacks?.onError?.(err);
      throw err;
    }
    callbacks?.onParseComplete?.(parsed.rows.length);

    const first = parsed.rows[0];
    if (!first) return null;
    return this.mapRawToDraft(first);
  }

  getAcceptedExtensions(): string {
    return ".csv,.json,.xml";
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Falha ao ler arquivo: resultado não é texto"));
      };
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
      reader.readAsText(file, "UTF-8");
    });
  }

  private wrapParseError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes("JSON")) {
        return new Error(`Erro ao interpretar JSON: ${error.message}`);
      }
      if (error.message.includes("XML")) {
        return new Error(`Erro ao interpretar XML: ${error.message}`);
      }
      if (error.message.includes("CSV")) {
        return new Error(`Erro ao interpretar CSV: ${error.message}`);
      }
      return error;
    }
    return new Error("Erro desconhecido ao processar arquivo");
  }

  private mapRawToDraft(record: ImportRawRecord): ProjectImportDraft {
    const value = (keys: readonly string[]): string => {
      for (const key of keys) {
        const found =
          record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
        if (found !== undefined && found !== null && String(found).trim()) {
          return String(found).trim();
        }
      }
      return "";
    };

    const statusRaw = value(["status", "estado"]).toLowerCase();
    const status: ProjectImportDraft["status"] = PROJECT_STATUS_SET.has(
      statusRaw as ProjectImportDraft["status"],
    )
      ? (statusRaw as ProjectImportDraft["status"])
      : "planned";

    return {
      name: value(["name", "nome", "project", "projeto"]),
      code: value(["code", "codigo", "sigla"]),
      description: value(["description", "descricao", "desc"]),
      notes: value(["notes", "notas", "observacoes"]),
      status,
      ownerEmail: value(["ownerEmail", "owner", "responsavel", "email"]),
      dueAt: value(["dueAt", "due", "previsao"]),
      deadlineAt: value(["deadlineAt", "deadline", "entrega"]),
      tags: value(["tags", "etiquetas"]),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
