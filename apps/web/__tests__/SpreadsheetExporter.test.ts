import { describe, expect, it, vi } from "vitest";
import {
  DashboardProjectsCsvBlueprint,
  ExportFileNameFactory,
  SpreadsheetExporter,
  type DashboardProjectsExportColumnKey,
  type DashboardProjectsExportRow,
  type FileDownloadGateway,
  type XlsxModuleResolver,
} from "../src/utils/export";

type DownloadedFile = {
  fileName: string;
  blob: Blob;
};

class MemoryDownloadGateway implements FileDownloadGateway {
  public readonly files: DownloadedFile[] = [];

  public download(blob: Blob, fileName: string): void {
    this.files.push({ blob, fileName });
  }
}

const encodeCol = (index: number): string => {
  let value = index;
  let output = "";
  do {
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return output;
};

const encodeCell = ({ r, c }: { r: number; c: number }): string =>
  `${encodeCol(c)}${r + 1}`;

const createFakeXlsxResolver = () => {
  let appendedSheet: Record<string, any> | null = null;

  const aoa_to_sheet = vi.fn((aoa: Array<Array<string | number | boolean>>) => {
    const worksheet: Record<string, any> = {};
    aoa.forEach((row, rowIndex) => {
      row.forEach((cellValue, columnIndex) => {
        worksheet[encodeCell({ r: rowIndex, c: columnIndex })] = { v: cellValue };
      });
    });
    return worksheet;
  });

  const book_new = vi.fn(() => ({ SheetNames: [] as string[], Sheets: {} as any }));
  const book_append_sheet = vi.fn((workbook: any, sheet: any, name: string) => {
    workbook.SheetNames.push(name);
    workbook.Sheets[name] = sheet;
    appendedSheet = sheet as Record<string, any>;
  });
  const write = vi.fn(() => new ArrayBuffer(16));

  const resolver: XlsxModuleResolver = {
    resolve: vi.fn(async () => ({
      utils: {
        aoa_to_sheet,
        book_new,
        book_append_sheet,
        encode_col: encodeCol,
        encode_cell: encodeCell,
      },
      write,
    } as any)),
  };

  return {
    resolver,
    getAppendedSheet: () => appendedSheet,
    aoa_to_sheet,
    write,
  };
};

const createProjectsExporter = (
  downloader: MemoryDownloadGateway,
  resolver: XlsxModuleResolver,
) =>
  new SpreadsheetExporter<
    DashboardProjectsExportRow,
    DashboardProjectsExportColumnKey,
    DashboardProjectsCsvBlueprint
  >({
    fileNamePrefix: "projetos-dashboard",
    sheetName: "Projetos",
    defaultColumnKeys: [
      "codigo",
      "nome",
      "responsavel",
      "status",
      "tags",
      "prazo",
      "entrega",
    ],
    buildBlueprint: (columnKeys) =>
      new DashboardProjectsCsvBlueprint({ columns: columnKeys }),
    downloader,
    xlsxResolver: resolver,
    fileNameFactory: new ExportFileNameFactory(() => new Date(2026, 1, 12)),
    resolveCellStyle: ({ columnKey, record }) => {
      if (columnKey === "status" && record.status === "Bloqueado") {
        return {
          fillColor: "FFFEE2E2",
          fontColor: "FFB91C1C",
          bold: true,
          align: "center",
        };
      }
      return null;
    },
  });

const readBlobAsText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

const sampleProjectRows: DashboardProjectsExportRow[] = [
  {
    codigo: "PRJ-001",
    nome: "Novo Portal",
    responsavel: "owner@corp.local",
    status: "Bloqueado",
    tags: "crm, web",
    prazo: "2026-02-28",
    entrega: "2026-03-08",
  },
];

describe("SpreadsheetExporter", () => {
  it("should export CSV with selected columns only", async () => {
    const downloader = new MemoryDownloadGateway();
    const fakeXlsx = createFakeXlsxResolver();
    const exporter = createProjectsExporter(downloader, fakeXlsx.resolver);

    const result = await exporter.export(sampleProjectRows, {
      formats: ["csv"],
      columnKeys: ["nome", "status"],
    });

    expect(result).toEqual(["csv"]);
    expect(downloader.files).toHaveLength(1);
    expect(downloader.files[0]?.fileName).toBe("projetos-dashboard-20260212.csv");

    const csvContent = await readBlobAsText(downloader.files[0]?.blob as Blob);
    expect(csvContent).toContain("Nome;Status");
    expect(csvContent).toContain("Novo Portal;Bloqueado");
    expect(csvContent).not.toContain("Responsável");
  });

  it("should export CSV and XLSX by default when formats are omitted", async () => {
    const downloader = new MemoryDownloadGateway();
    const fakeXlsx = createFakeXlsxResolver();
    const exporter = createProjectsExporter(downloader, fakeXlsx.resolver);

    const result = await exporter.export(sampleProjectRows, {
      columnKeys: ["codigo", "nome", "status"],
    });

    expect(result).toEqual(["csv", "xlsx"]);
    expect(downloader.files).toHaveLength(2);
    expect(downloader.files[0]?.fileName).toBe("projetos-dashboard-20260212.csv");
    expect(downloader.files[1]?.fileName).toBe("projetos-dashboard-20260212.xlsx");
    expect(fakeXlsx.resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("should apply custom XLSX styles to matching cells", async () => {
    const downloader = new MemoryDownloadGateway();
    const fakeXlsx = createFakeXlsxResolver();
    const exporter = createProjectsExporter(downloader, fakeXlsx.resolver);

    const result = await exporter.export(sampleProjectRows, {
      formats: ["xlsx"],
      columnKeys: ["nome", "status"],
    });

    expect(result).toEqual(["xlsx"]);
    expect(downloader.files).toHaveLength(1);
    expect(downloader.files[0]?.fileName).toBe("projetos-dashboard-20260212.xlsx");

    const sheet = fakeXlsx.getAppendedSheet();
    expect(sheet).toBeTruthy();
    expect(sheet?.A1?.s?.font?.bold).toBe(true);
    expect(sheet?.B2?.s?.fill?.fgColor?.rgb).toBe("FFFEE2E2");
    expect(sheet?.["!autofilter"]?.ref).toBe("A1:B1");
  });
});
