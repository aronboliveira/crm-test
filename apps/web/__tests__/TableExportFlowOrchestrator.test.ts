import { describe, expect, it, vi } from "vitest";
import type { SpreadsheetExportFormat } from "../src/utils/export";
import TableExportFlowOrchestrator from "../src/services/TableExportFlowOrchestrator";

type MockSelection = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const createAlertGateway = () => ({
  success: vi.fn<(...args: [string, string]) => Promise<void>>(
    async () => undefined,
  ),
  error: vi.fn<(...args: [string, unknown]) => Promise<void>>(
    async () => undefined,
  ),
});

describe("TableExportFlowOrchestrator", () => {
  it("returns false when dialog is cancelled", async () => {
    const alerts = createAlertGateway();
    const orchestrator = new TableExportFlowOrchestrator("unit", alerts);
    const buildRecords = vi.fn(() => [{ id: "1" }]);
    const exportRecords = vi.fn(async () => ["csv"] as SpreadsheetExportFormat[]);

    const result = await orchestrator.execute({
      openDialog: async () => null,
      buildRecords,
      exportRecords,
      emptyStateMessage: "sem dados",
    });

    expect(result).toBe(false);
    expect(buildRecords).not.toHaveBeenCalled();
    expect(exportRecords).not.toHaveBeenCalled();
    expect(alerts.error).not.toHaveBeenCalled();
    expect(alerts.success).not.toHaveBeenCalled();
  });

  it("shows empty-state error and skips export when record set is empty", async () => {
    const alerts = createAlertGateway();
    const orchestrator = new TableExportFlowOrchestrator("unit", alerts);
    const openDialog = async (): Promise<MockSelection> => ({
      formats: ["csv"],
      columnKeys: ["nome"],
    });
    const exportRecords = vi.fn(async () => ["csv"] as SpreadsheetExportFormat[]);

    const result = await orchestrator.execute({
      openDialog,
      buildRecords: async () => [],
      exportRecords,
      emptyStateMessage: "nada para exportar",
    });

    expect(result).toBe(false);
    expect(exportRecords).not.toHaveBeenCalled();
    expect(alerts.error).toHaveBeenCalledWith("Exportação", "nada para exportar");
  });

  it("exports records and reports success formats", async () => {
    const alerts = createAlertGateway();
    const orchestrator = new TableExportFlowOrchestrator("unit", alerts);
    const openDialog = async (): Promise<MockSelection> => ({
      formats: ["csv"],
      columnKeys: ["nome"],
    });

    const result = await orchestrator.execute({
      openDialog,
      buildRecords: async () => [{ nome: "Acme" }],
      exportRecords: async () => ["csv", "xlsx"],
      emptyStateMessage: "sem linhas",
    });

    expect(result).toBe(true);
    expect(alerts.success).toHaveBeenCalledWith(
      "Exportação concluída",
      "CSV e XLSX gerado(s) com sucesso.",
    );
  });

  it("formats export error payload before notifying", async () => {
    const alerts = createAlertGateway();
    const orchestrator = new TableExportFlowOrchestrator("unit", alerts);
    const openDialog = async (): Promise<MockSelection> => ({
      formats: ["xlsx"],
      columnKeys: ["nome"],
    });

    const result = await orchestrator.execute({
      openDialog,
      buildRecords: async () => [{ nome: "Acme" }],
      exportRecords: async () => {
        throw new Error("network");
      },
      emptyStateMessage: "sem linhas",
      formatError: () => "Falha customizada",
      failureTitle: "Erro customizado",
    });

    expect(result).toBe(false);
    expect(alerts.error).toHaveBeenCalledWith(
      "Erro customizado",
      "Falha customizada",
    );
  });
});
