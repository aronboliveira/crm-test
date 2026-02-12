import type * as XLSXTypes from "xlsx-js-style";
import { CsvDocumentBuilder } from "../csv/CsvDocumentBuilder";
import { BrowserFileDownloadGateway } from "./BrowserFileDownloadGateway";
import { ExportFileNameFactory } from "./ExportFileNameFactory";
import { LazyXlsxModuleResolver } from "./LazyXlsxModuleResolver";
import type {
  FileDownloadGateway,
  SpreadsheetBlueprint,
  SpreadsheetCellStyleContext,
  SpreadsheetCellStylePatch,
  SpreadsheetExportFormat,
  SpreadsheetHorizontalAlign,
  XlsxModule,
  XlsxModuleResolver,
} from "./SpreadsheetTypes";

type StyledWorksheet = XLSXTypes.WorkSheet & {
  "!cols"?: Array<{ wch: number }>;
  "!rows"?: Array<{ hpt?: number }>;
  "!autofilter"?: { ref: string };
};

type ExportCellStyleOptions = {
  fillColor: string;
  fontColor?: string;
  bold?: boolean;
  align?: SpreadsheetHorizontalAlign;
  fontSize?: number;
};

type SpreadsheetExporterOptions<
  TRecord,
  TColumnKey extends string,
  TBlueprint extends SpreadsheetBlueprint<TRecord, TColumnKey>,
> = {
  fileNamePrefix: string;
  sheetName: string;
  defaultColumnKeys: readonly TColumnKey[];
  buildBlueprint: (columnKeys: readonly TColumnKey[]) => TBlueprint;
  columnWidthByKey?: Readonly<Partial<Record<TColumnKey, number>>>;
  centeredColumnKeys?: readonly TColumnKey[];
  resolveCellStyle?: (
    context: SpreadsheetCellStyleContext<TRecord, TColumnKey>,
  ) => SpreadsheetCellStylePatch | null;
  downloader?: FileDownloadGateway;
  xlsxResolver?: XlsxModuleResolver;
  fileNameFactory?: ExportFileNameFactory;
};

type SpreadsheetExportConfig<TColumnKey extends string> = {
  formats?: readonly SpreadsheetExportFormat[];
  columnKeys?: readonly TColumnKey[];
};

const EXPORT_COLORS = {
  headerFill: "FF334155",
  headerFont: "FFF8FAFC",
  cellText: "FF0F172A",
  border: "FFE2E8F0",
  zebraOdd: "FFFFFFFF",
  zebraEven: "FFF8FAFC",
} as const;

const EXPORT_CELL_BORDER: NonNullable<XLSXTypes.CellStyle["border"]> = {
  top: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  right: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  bottom: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
  left: { style: "thin", color: { rgb: EXPORT_COLORS.border } },
};

const createCellStyle = ({
  fillColor,
  fontColor = EXPORT_COLORS.cellText,
  bold = false,
  align = "left",
  fontSize = 11,
}: ExportCellStyleOptions): XLSXTypes.CellStyle => ({
  font: {
    name: "Calibri",
    sz: fontSize,
    color: { rgb: fontColor },
    bold,
  },
  fill: {
    patternType: "solid",
    fgColor: { rgb: fillColor },
  },
  alignment: {
    horizontal: align,
    vertical: "center",
    wrapText: false,
  },
  border: EXPORT_CELL_BORDER,
});

const toZebraFill = (rowIndex: number): string =>
  rowIndex % 2 === 0 ? EXPORT_COLORS.zebraOdd : EXPORT_COLORS.zebraEven;

export class SpreadsheetExporter<
  TRecord,
  TColumnKey extends string,
  TBlueprint extends SpreadsheetBlueprint<TRecord, TColumnKey>,
> {
  private readonly options: SpreadsheetExporterOptions<
    TRecord,
    TColumnKey,
    TBlueprint
  >;
  private readonly downloader: FileDownloadGateway;
  private readonly xlsxResolver: XlsxModuleResolver;
  private readonly fileNameFactory: ExportFileNameFactory;

  public constructor(
    options: SpreadsheetExporterOptions<TRecord, TColumnKey, TBlueprint>,
  ) {
    this.options = options;
    this.downloader = options.downloader ?? new BrowserFileDownloadGateway();
    this.xlsxResolver = options.xlsxResolver ?? new LazyXlsxModuleResolver();
    this.fileNameFactory = options.fileNameFactory ?? new ExportFileNameFactory();
  }

  public async export(
    records: readonly TRecord[],
    config: SpreadsheetExportConfig<TColumnKey> = {},
  ): Promise<SpreadsheetExportFormat[]> {
    const formats = this.normalizeFormats(config.formats);
    const columnKeys = this.normalizeColumnKeys(config.columnKeys);
    const blueprint = this.options.buildBlueprint(columnKeys);
    const exportedFormats: SpreadsheetExportFormat[] = [];

    if (formats.includes("csv")) {
      const csvBuilder = new CsvDocumentBuilder(blueprint);
      const csvContent = csvBuilder.build(records);
      this.downloader.download(
        new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
        this.fileNameFactory.build(this.options.fileNamePrefix, "csv"),
      );
      exportedFormats.push("csv");
    }

    if (formats.includes("xlsx")) {
      const xlsx = await this.xlsxResolver.resolve();
      const aoa = blueprint.toAoa(records);
      const worksheet = xlsx.utils.aoa_to_sheet(aoa) as StyledWorksheet;
      this.applyXlsxStyles(
        xlsx,
        worksheet,
        aoa,
        records,
        blueprint.getColumnKeys(),
      );

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, this.options.sheetName);

      const content = xlsx.write(workbook, {
        type: "array",
        bookType: "xlsx",
        cellStyles: true,
      });

      this.downloader.download(
        new Blob([content], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        this.fileNameFactory.build(this.options.fileNamePrefix, "xlsx"),
      );

      exportedFormats.push("xlsx");
    }

    return exportedFormats;
  }

  private normalizeFormats(
    formats: readonly SpreadsheetExportFormat[] | undefined,
  ): SpreadsheetExportFormat[] {
    const selected = new Set(formats ?? ["csv", "xlsx"]);
    const ordered = ["csv", "xlsx"].filter(
      (format): format is SpreadsheetExportFormat => selected.has(format),
    );
    return ordered.length ? ordered : ["csv", "xlsx"];
  }

  private normalizeColumnKeys(
    columnKeys: readonly TColumnKey[] | undefined,
  ): TColumnKey[] {
    const selected = new Set(columnKeys ?? this.options.defaultColumnKeys);
    const ordered = this.options.defaultColumnKeys.filter((key) =>
      selected.has(key),
    );
    return ordered.length ? [...ordered] : [...this.options.defaultColumnKeys];
  }

  private applyXlsxStyles(
    xlsx: XlsxModule,
    worksheet: StyledWorksheet,
    aoa: Array<Array<string | number | boolean>>,
    records: readonly TRecord[],
    columnKeys: readonly TColumnKey[],
  ): void {
    const headers = (aoa[0] ?? []) as string[];
    const centeredColumns = new Set(this.options.centeredColumnKeys ?? []);

    worksheet["!cols"] = columnKeys.map((key, index) => {
      const defaultWidth = Math.min(
        44,
        Math.max(12, String(headers[index] ?? "").length + 6),
      );
      return {
        wch: this.options.columnWidthByKey?.[key] ?? defaultWidth,
      };
    });
    worksheet["!rows"] = [{ hpt: 30 }, ...records.map(() => ({ hpt: 23 }))];

    if (columnKeys.length > 0) {
      const lastColumn = xlsx.utils.encode_col(columnKeys.length - 1);
      worksheet["!autofilter"] = { ref: `A1:${lastColumn}1` };
    }

    for (let columnIndex = 0; columnIndex < columnKeys.length; columnIndex += 1) {
      const address = xlsx.utils.encode_cell({ r: 0, c: columnIndex });
      const cell = worksheet[address];
      if (!cell) continue;

      cell.s = createCellStyle({
        fillColor: EXPORT_COLORS.headerFill,
        fontColor: EXPORT_COLORS.headerFont,
        bold: true,
        align: "center",
        fontSize: 12,
      });
    }

    records.forEach((record, rowIndex) => {
      const excelRow = rowIndex + 1;
      const rowFill = toZebraFill(rowIndex);

      for (let columnIndex = 0; columnIndex < columnKeys.length; columnIndex += 1) {
        const columnKey = columnKeys[columnIndex];
        if (columnKey === undefined) continue;
        const address = xlsx.utils.encode_cell({ r: excelRow, c: columnIndex });
        const cell = worksheet[address];
        if (!cell) continue;

        const styleOptions: ExportCellStyleOptions = {
          fillColor: rowFill,
          fontColor: EXPORT_COLORS.cellText,
          align: centeredColumns.has(columnKey) ? "center" : "left",
        };

        const customStyle = this.options.resolveCellStyle?.({
          record,
          rowIndex,
          columnIndex,
          columnKey,
        });

        if (customStyle?.fillColor) styleOptions.fillColor = customStyle.fillColor;
        if (customStyle?.fontColor) styleOptions.fontColor = customStyle.fontColor;
        if (typeof customStyle?.bold === "boolean") {
          styleOptions.bold = customStyle.bold;
        }
        if (customStyle?.align) styleOptions.align = customStyle.align;
        if (customStyle?.numberFormat) cell.z = customStyle.numberFormat;

        cell.s = createCellStyle(styleOptions);
      }
    });
  }
}

export type { SpreadsheetExportConfig, SpreadsheetExporterOptions };
