/**
 * @fileoverview Service for mass importing clients from CSV/JSON/XML files.
 *
 * Orchestrates:
 * - File reading with progress feedback
 * - Parsing via ImportDocumentParserRegistry
 * - Validation via ClientImportBlueprint
 * - API submission with batch processing
 * - Error aggregation and reporting
 *
 * Design:
 * - **SRP**: Only responsible for import orchestration.
 * - **OCP**: New file formats add parsers, not modify this service.
 * - **DIP**: Depends on parser and blueprint interfaces.
 * - **LSP**: ImportBlueprint subtypes are interchangeable.
 *
 * @module services/ClientMassImportService
 */

import { ImportDocumentParserRegistry } from "../utils/import/parsers/ImportDocumentParserRegistry";
import {
  ClientImportBlueprint,
  type ClientImportDraft,
  type ClientImportPayload,
} from "../utils/import/blueprints/ClientImportBlueprint";
import type {
  ParsedImportDocument,
  ImportRawRecord,
} from "../utils/import/ImportSourceTypes";
import { BrazilApiCepLookupGateway } from "../utils/import/CepLookupGateway";
import ApiClientService from "./ApiClientService";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ImportValidationError = Readonly<{
  row: number;
  field: string;
  message: string;
}>;

export type ImportParsedRow = Readonly<{
  rowNumber: number;
  rawRecord: ImportRawRecord;
  draft: ClientImportDraft;
  payload: ClientImportPayload | null;
  errors: ReadonlyArray<{ field: string; message: string }>;
  isValid: boolean;
}>;

export type ImportParseResult = Readonly<{
  format: string;
  totalRows: number;
  parsedRows: readonly ImportParsedRow[];
  validCount: number;
  invalidCount: number;
  errors: readonly ImportValidationError[];
  warnings: readonly string[];
}>;

export type ImportSubmitResult = Readonly<{
  totalSubmitted: number;
  successCount: number;
  failedCount: number;
  createdIds: readonly string[];
  errors: readonly ImportValidationError[];
}>;

export type ImportMode = "mass" | "single";

export interface ImportProgressCallbacks {
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

/* -------------------------------------------------------------------------- */
/*  Service                                                                    */
/* -------------------------------------------------------------------------- */

export default class ClientMassImportService {
  private readonly parserRegistry: ImportDocumentParserRegistry;
  private readonly blueprint: ClientImportBlueprint;

  constructor() {
    this.parserRegistry = new ImportDocumentParserRegistry();
    this.blueprint = new ClientImportBlueprint(new BrazilApiCepLookupGateway());
  }

  /* ----- Public API ----------------------------------------------------- */

  /**
   * Parse a file and validate all rows.
   * Does NOT submit to server - returns parsed/validated rows for preview.
   */
  async parseAndValidate(
    file: File,
    callbacks?: ImportProgressCallbacks,
  ): Promise<ImportParseResult> {
    // Step 1: Read file content
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

    // Step 2: Parse file
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

    // Step 3: Validate each row
    callbacks?.onValidateStart?.(parsed.rows.length);
    const parsedRows: ImportParsedRow[] = [];
    const allErrors: ImportValidationError[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const rawRecord = parsed.rows[i];
      if (!rawRecord) continue;

      const rowNumber = parsed.rowNumberOffset + i;
      const draft = this.mapRawToDraft(rawRecord);
      const syncErrors = this.blueprint.validateDraftSync(draft);

      const errors = Object.entries(syncErrors).map(([field, message]) => ({
        field,
        message: message ?? "Erro de validação",
      }));

      const isValid = errors.length === 0;
      let payload: ClientImportPayload | null = null;

      if (isValid) {
        payload = this.blueprint.toPayload(draft);
      } else {
        errors.forEach((err) => {
          allErrors.push({
            row: rowNumber,
            field: err.field,
            message: err.message,
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

    const validCount = parsedRows.filter((r) => r.isValid).length;
    const invalidCount = parsedRows.filter((r) => !r.isValid).length;

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

  /**
   * Submit validated rows to the server.
   * Only submits rows that passed validation.
   */
  async submitValidRows(
    parsedRows: readonly ImportParsedRow[],
    callbacks?: ImportProgressCallbacks,
  ): Promise<ImportSubmitResult> {
    const validRows = parsedRows.filter((r) => r.isValid && r.payload);
    const totalSubmitted = validRows.length;

    if (totalSubmitted === 0) {
      return {
        totalSubmitted: 0,
        successCount: 0,
        failedCount: 0,
        createdIds: [],
        errors: [],
      };
    }

    callbacks?.onSubmitStart?.(totalSubmitted);

    const createdIds: string[] = [];
    const errors: ImportValidationError[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process in batches of 10 to avoid overwhelming the server
    const BATCH_SIZE = 10;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row) => {
          if (!row.payload) return;

          try {
            const created = await ApiClientService.clients.create(row.payload);
            if (created?.id) {
              createdIds.push(created.id);
              successCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            failedCount++;
            const message =
              err instanceof Error
                ? err.message
                : "Falha ao criar cliente no servidor";
            errors.push({
              row: row.rowNumber,
              field: "server",
              message,
            });
          }
        }),
      );

      callbacks?.onSubmitProgress?.(
        Math.min(i + BATCH_SIZE, validRows.length),
        totalSubmitted,
      );

      // Small delay between batches
      if (i + BATCH_SIZE < validRows.length) {
        await this.delay(50);
      }
    }

    callbacks?.onSubmitComplete?.(successCount, failedCount);

    return {
      totalSubmitted,
      successCount,
      failedCount,
      createdIds,
      errors,
    };
  }

  /**
   * Parse file for single client form fill.
   * Returns the first valid row as a draft.
   */
  async parseForSingleClient(
    file: File,
    callbacks?: ImportProgressCallbacks,
  ): Promise<ClientImportDraft | null> {
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

    if (parsed.rows.length === 0) {
      return null;
    }

    // Get the first row
    const rawRecord = parsed.rows[0];
    if (!rawRecord) return null;

    const draft = this.mapRawToDraft(rawRecord);
    return draft;
  }

  /**
   * Get accepted file extensions string for input.
   */
  getAcceptedExtensions(): string {
    return ".csv,.json,.xml";
  }

  /**
   * Get accepted MIME types for validation.
   */
  getAcceptedMimeTypes(): string[] {
    return [
      "text/csv",
      "application/csv",
      "text/plain",
      "application/json",
      "text/json",
      "application/xml",
      "text/xml",
    ];
  }

  /* ----- Private Helpers ------------------------------------------------ */

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Falha ao ler arquivo: resultado não é texto"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Falha ao ler arquivo"));
      };

      reader.readAsText(file, "UTF-8");
    });
  }

  private wrapParseError(error: unknown): Error {
    if (error instanceof Error) {
      // Check for JSON-specific errors
      if (error.message.includes("JSON")) {
        return new Error(
          `Erro ao interpretar JSON: ${error.message}. Verifique se o arquivo está no formato correto.`,
        );
      }
      // Check for XML-specific errors
      if (error.message.includes("XML")) {
        return new Error(
          `Erro ao interpretar XML: ${error.message}. Verifique se o arquivo está bem formatado.`,
        );
      }
      // Check for CSV-specific errors
      if (error.message.includes("CSV")) {
        return new Error(
          `Erro ao interpretar CSV: ${error.message}. Verifique se o separador está correto.`,
        );
      }
      return error;
    }
    return new Error("Erro desconhecido ao processar arquivo");
  }

  /**
   * Map raw record from parsed file to ClientImportDraft.
   * Handles various column name formats.
   */
  private mapRawToDraft(record: ImportRawRecord): ClientImportDraft {
    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const value =
          record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
        if (value !== undefined && value !== null && String(value).trim()) {
          return String(value).trim();
        }
      }
      return "";
    };

    const name = getValue([
      "name",
      "nome",
      "razaoSocial",
      "razao_social",
      "nomeCliente",
      "cliente",
    ]);
    const typeRaw = getValue([
      "type",
      "tipo",
      "tipoCliente",
      "tipo_cliente",
    ]).toLowerCase();
    const type: "pessoa" | "empresa" =
      typeRaw === "empresa" ||
      typeRaw === "pj" ||
      typeRaw === "juridica" ||
      typeRaw === "company"
        ? "empresa"
        : "pessoa";

    const company = getValue([
      "company",
      "empresa",
      "nomeEmpresa",
      "nome_empresa",
    ]);
    const cnpj = getValue(["cnpj", "CNPJ", "documento"]);
    const cep = getValue(["cep", "CEP", "zipCode", "zip_code", "codigoPostal"]);
    const email = getValue([
      "email",
      "Email",
      "EMAIL",
      "emailPrincipal",
      "email_principal",
    ]);
    const phone = getValue([
      "phone",
      "telefone",
      "fone",
      "tel",
      "telefonePrincipal",
    ]);
    const cellPhone = getValue([
      "cellPhone",
      "celular",
      "cel",
      "mobile",
      "telefoneCelular",
    ]);
    const whatsappNumber = getValue([
      "whatsapp",
      "whatsappNumber",
      "numeroWhatsapp",
      "zap",
    ]);
    const preferredContactRaw = getValue([
      "preferredContact",
      "contatoPreferido",
      "contato_preferido",
      "preferencia",
    ]).toLowerCase();

    let preferredContact: "email" | "phone" | "whatsapp" | "cellphone" =
      "email";
    if (
      preferredContactRaw.includes("whatsapp") ||
      preferredContactRaw.includes("zap")
    ) {
      preferredContact = "whatsapp";
    } else if (
      preferredContactRaw.includes("celular") ||
      preferredContactRaw.includes("cell")
    ) {
      preferredContact = "cellphone";
    } else if (
      preferredContactRaw.includes("telefone") ||
      preferredContactRaw.includes("phone")
    ) {
      preferredContact = "phone";
    }

    const notes = getValue([
      "notes",
      "notas",
      "observacoes",
      "obs",
      "observacao",
    ]);

    return {
      name,
      type,
      company,
      cnpj,
      cep,
      email,
      phone,
      cellPhone,
      whatsappNumber,
      preferredContact,
      notes,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for convenience.
 */
export const clientMassImportService = new ClientMassImportService();
