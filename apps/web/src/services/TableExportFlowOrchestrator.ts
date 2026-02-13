import type { SpreadsheetExportFormat } from "../utils/export";
import AlertService from "./AlertService";

type BaseExportSelection = Readonly<{
  formats: readonly SpreadsheetExportFormat[];
}>;

export interface TableExportAlertGateway {
  success(title: string, message: string): Promise<void>;
  error(title: string, message: unknown): Promise<void>;
}

class AlertServiceGateway implements TableExportAlertGateway {
  async success(title: string, message: string): Promise<void> {
    await AlertService.success(title, message);
  }

  async error(title: string, message: unknown): Promise<void> {
    await AlertService.error(title, message);
  }
}

export type TableExportFlowOptions<
  TRecord,
  TSelection extends BaseExportSelection,
> = Readonly<{
  openDialog: () => Promise<TSelection | null>;
  buildRecords: (
    selection: TSelection,
  ) => Promise<readonly TRecord[]> | readonly TRecord[];
  exportRecords: (
    records: readonly TRecord[],
    selection: TSelection,
  ) => Promise<readonly SpreadsheetExportFormat[]>;
  emptyStateMessage: string;
  emptyStateTitle?: string;
  successTitle?: string;
  failureTitle?: string;
  formatError?: (error: unknown) => unknown;
}>;

export default class TableExportFlowOrchestrator {
  #alerts: TableExportAlertGateway;
  #contextLabel: string;

  constructor(contextLabel = "TableExport", alerts?: TableExportAlertGateway) {
    this.#contextLabel = contextLabel;
    this.#alerts = alerts ?? new AlertServiceGateway();
  }

  async execute<TRecord, TSelection extends BaseExportSelection>(
    options: TableExportFlowOptions<TRecord, TSelection>,
  ): Promise<boolean> {
    try {
      const selection = await options.openDialog();
      if (!selection) {
        return false;
      }

      const records = await options.buildRecords(selection);
      if (!Array.isArray(records) || records.length === 0) {
        await this.#alerts.error(
          options.emptyStateTitle ?? "Exportação",
          options.emptyStateMessage,
        );
        return false;
      }

      const exportedFormats = await options.exportRecords(records, selection);
      const formatLabels = this.#resolveFormatLabels(selection, exportedFormats);
      await this.#alerts.success(
        options.successTitle ?? "Exportação concluída",
        `${formatLabels} gerado(s) com sucesso.`,
      );
      return true;
    } catch (caughtError) {
      const payload = options.formatError
        ? options.formatError(caughtError)
        : caughtError;
      console.error(`[${this.#contextLabel}] Export failed:`, payload);
      await this.#alerts.error(options.failureTitle ?? "Erro ao exportar", payload);
      return false;
    }
  }

  #resolveFormatLabels<TSelection extends BaseExportSelection>(
    selection: TSelection,
    exportedFormats: readonly SpreadsheetExportFormat[],
  ): string {
    const source = Array.isArray(exportedFormats) && exportedFormats.length
      ? exportedFormats
      : selection.formats;
    return source.map((format) => String(format).toUpperCase()).join(" e ");
  }
}
