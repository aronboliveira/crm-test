import { ImportDocumentParserRegistry } from "../utils/import/parsers/ImportDocumentParserRegistry";
import {
  TaskImportBlueprint,
  type TaskImportDraft,
  type TaskImportPayload,
  type TaskPriority,
  type TaskStatus,
} from "../utils/import/blueprints/TaskImportBlueprint";
import type {
  ParsedImportDocument,
  ImportRawRecord,
} from "../utils/import/ImportSourceTypes";
import ApiClientService from "./ApiClientService";

export type TaskImportValidationError = Readonly<{
  row: number;
  field: string;
  message: string;
}>;
export type TaskImportParsedRow = Readonly<{
  rowNumber: number;
  rawRecord: ImportRawRecord;
  draft: TaskImportDraft;
  payload: TaskImportPayload | null;
  errors: ReadonlyArray<{ field: string; message: string }>;
  isValid: boolean;
}>;
export type TaskImportParseResult = Readonly<{
  format: string;
  totalRows: number;
  parsedRows: readonly TaskImportParsedRow[];
  validCount: number;
  invalidCount: number;
  errors: readonly TaskImportValidationError[];
  warnings: readonly string[];
}>;
export type TaskImportSubmitResult = Readonly<{
  totalSubmitted: number;
  successCount: number;
  failedCount: number;
  errors: readonly TaskImportValidationError[];
}>;

export interface TaskImportProgressCallbacks {
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

const TASK_STATUS_SET: readonly TaskStatus[] = [
  "todo",
  "doing",
  "done",
  "blocked",
];

export default class TaskImportService {
  private readonly parserRegistry = new ImportDocumentParserRegistry();
  private readonly blueprint = new TaskImportBlueprint();

  async parseAndValidate(
    file: File,
    callbacks?: TaskImportProgressCallbacks,
  ): Promise<TaskImportParseResult> {
    callbacks?.onReadStart?.();
    const content = await this.read(file).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw err;
    });
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
      const err =
        error instanceof Error ? error : new Error("Erro ao processar arquivo");
      callbacks?.onError?.(err);
      throw err;
    }
    callbacks?.onParseComplete?.(parsed.rows.length);

    callbacks?.onValidateStart?.(parsed.rows.length);
    const parsedRows: TaskImportParsedRow[] = [];
    const errors: TaskImportValidationError[] = [];

    for (let index = 0; index < parsed.rows.length; index++) {
      const rawRecord = parsed.rows[index];
      if (!rawRecord) continue;
      const rowNumber = parsed.rowNumberOffset + index;
      const draft = this.mapRawToDraft(rawRecord);
      const validation = await this.blueprint.validateDraft(draft);
      const rowErrors = Object.entries(validation.errors).map(
        ([field, message]) => ({
          field,
          message: message ?? "Erro de validação",
        }),
      );
      const isValid = rowErrors.length === 0;
      const payload = isValid ? this.blueprint.toPayload(draft) : null;
      if (!isValid) {
        rowErrors.forEach((error) =>
          errors.push({
            row: rowNumber,
            field: error.field,
            message: error.message,
          }),
        );
      }
      parsedRows.push({
        rowNumber,
        rawRecord,
        draft,
        payload,
        errors: rowErrors,
        isValid,
      });
      callbacks?.onValidateProgress?.(index + 1, parsed.rows.length);
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
      errors,
      warnings: parsed.warnings,
    };
  }

  async submitValidRows(
    parsedRows: readonly TaskImportParsedRow[],
    callbacks?: TaskImportProgressCallbacks,
  ): Promise<TaskImportSubmitResult> {
    const validRows = parsedRows.filter((row) => row.isValid && row.payload);
    callbacks?.onSubmitStart?.(validRows.length);
    let successCount = 0;
    let failedCount = 0;
    const errors: TaskImportValidationError[] = [];

    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];
      if (!row?.payload) continue;
      try {
        await ApiClientService.tasks.create(row.payload);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          row: row.rowNumber,
          field: "server",
          message:
            error instanceof Error ? error.message : "Falha ao criar tarefa",
        });
      }
      callbacks?.onSubmitProgress?.(index + 1, validRows.length);
    }

    callbacks?.onSubmitComplete?.(successCount, failedCount);
    return {
      totalSubmitted: validRows.length,
      successCount,
      failedCount,
      errors,
    };
  }

  async parseForSingleTask(
    file: File,
    callbacks?: TaskImportProgressCallbacks,
  ): Promise<TaskImportDraft | null> {
    callbacks?.onReadStart?.();
    const content = await this.read(file);
    callbacks?.onReadComplete?.(file.name);
    callbacks?.onParseStart?.();
    const parser = this.parserRegistry.resolve({
      name: file.name,
      type: file.type,
    });
    const parsed = parser.parse(content);
    callbacks?.onParseComplete?.(parsed.rows.length);
    const first = parsed.rows[0];
    return first ? this.mapRawToDraft(first) : null;
  }

  getAcceptedExtensions(): string {
    return ".csv,.json,.xml";
  }

  private read(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Arquivo inválido"));
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
      reader.readAsText(file, "UTF-8");
    });
  }

  private mapRawToDraft(record: ImportRawRecord): TaskImportDraft {
    const value = (keys: readonly string[]): string => {
      for (const key of keys) {
        const found =
          record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
        if (found !== undefined && found !== null && String(found).trim())
          return String(found).trim();
      }
      return "";
    };

    const statusRaw = value(["status", "estado"]).toLowerCase();
    const status: TaskStatus = TASK_STATUS_SET.includes(statusRaw as TaskStatus)
      ? (statusRaw as TaskStatus)
      : "todo";
    const priorityNumber = Number(
      value(["priority", "prioridade", "prio"]) || "3",
    );
    const priority: TaskPriority =
      priorityNumber >= 1 && priorityNumber <= 5
        ? (priorityNumber as TaskPriority)
        : 3;

    return {
      title: value(["title", "titulo", "task", "tarefa"]),
      description: value(["description", "descricao", "desc"]),
      status,
      priority,
      assigneeEmail: value([
        "assigneeEmail",
        "assignee",
        "responsavel",
        "email",
      ]),
      projectId: value(["projectId", "project", "projeto"]),
      milestoneId: value(["milestoneId", "milestone", "marco"]),
      tags: value(["tags", "etiquetas"]),
      dueAt: value(["dueAt", "due", "previsao"]),
      deadlineAt: value(["deadlineAt", "deadline", "prazo"]),
    };
  }
}
