import { ImportDocumentParserRegistry } from "../utils/import/parsers/ImportDocumentParserRegistry";
import {
  LeadImportBlueprint,
  type LeadImportDraft,
  type LeadImportPayload,
  type LeadSource,
  type LeadStatus,
} from "../utils/import/blueprints/LeadImportBlueprint";
import type {
  ParsedImportDocument,
  ImportRawRecord,
} from "../utils/import/ImportSourceTypes";
import ApiClientService from "./ApiClientService";

export type LeadImportValidationError = Readonly<{
  row: number;
  field: string;
  message: string;
}>;
export type LeadImportParsedRow = Readonly<{
  rowNumber: number;
  rawRecord: ImportRawRecord;
  draft: LeadImportDraft;
  payload: LeadImportPayload | null;
  errors: ReadonlyArray<{ field: string; message: string }>;
  isValid: boolean;
}>;
export type LeadImportParseResult = Readonly<{
  format: string;
  totalRows: number;
  parsedRows: readonly LeadImportParsedRow[];
  validCount: number;
  invalidCount: number;
  errors: readonly LeadImportValidationError[];
  warnings: readonly string[];
}>;
export type LeadImportSubmitResult = Readonly<{
  totalSubmitted: number;
  successCount: number;
  failedCount: number;
  errors: readonly LeadImportValidationError[];
}>;

export interface LeadImportProgressCallbacks {
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

const LEAD_STATUS_SET: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
const LEAD_SOURCE_SET: readonly LeadSource[] = [
  "website",
  "referral",
  "social",
  "email_campaign",
  "cold_call",
  "event",
  "partner",
  "other",
];

export default class LeadImportService {
  private readonly parserRegistry = new ImportDocumentParserRegistry();
  private readonly blueprint = new LeadImportBlueprint();

  async parseAndValidate(
    file: File,
    callbacks?: LeadImportProgressCallbacks,
  ): Promise<LeadImportParseResult> {
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
    const parsedRows: LeadImportParsedRow[] = [];
    const errors: LeadImportValidationError[] = [];

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
    parsedRows: readonly LeadImportParsedRow[],
    callbacks?: LeadImportProgressCallbacks,
  ): Promise<LeadImportSubmitResult> {
    const validRows = parsedRows.filter((row) => row.isValid && row.payload);
    callbacks?.onSubmitStart?.(validRows.length);
    let successCount = 0;
    let failedCount = 0;
    const errors: LeadImportValidationError[] = [];

    for (let index = 0; index < validRows.length; index++) {
      const row = validRows[index];
      if (!row?.payload) continue;
      try {
        await ApiClientService.leads.create(row.payload);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          row: row.rowNumber,
          field: "server",
          message:
            error instanceof Error ? error.message : "Falha ao criar lead",
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

  async parseForSingleLead(
    file: File,
    callbacks?: LeadImportProgressCallbacks,
  ): Promise<LeadImportDraft | null> {
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

  private mapRawToDraft(record: ImportRawRecord): LeadImportDraft {
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
    const sourceRaw = value(["source", "origem", "fonte"]).toLowerCase();
    const status: LeadStatus = LEAD_STATUS_SET.includes(statusRaw as LeadStatus)
      ? (statusRaw as LeadStatus)
      : "new";
    const source: LeadSource = LEAD_SOURCE_SET.includes(sourceRaw as LeadSource)
      ? (sourceRaw as LeadSource)
      : "other";

    return {
      name: value(["name", "nome", "lead"]),
      email: value(["email", "correio", "e-mail"]),
      phone: value(["phone", "telefone", "cellPhone", "celular"]),
      company: value(["company", "empresa"]),
      status,
      source,
      assignedTo: value(["assignedTo", "responsavel", "assigned"]),
      estimatedValue: value(["estimatedValue", "value", "valor"]),
      notes: value(["notes", "notas", "observacoes"]),
      tags: value(["tags", "etiquetas"]),
    };
  }
}
