import type { CsvBlueprintBase } from "../csv/CsvBlueprintBase";

export type SpreadsheetExportFormat = "csv" | "xlsx";
export type SpreadsheetHorizontalAlign = "left" | "center" | "right";

export type SpreadsheetBlueprint<
  TRecord,
  TColumnKey extends string,
> = CsvBlueprintBase<TRecord> & {
  getColumnKeys(): TColumnKey[];
};

export type SpreadsheetCellStylePatch = Readonly<{
  fillColor?: string;
  fontColor?: string;
  bold?: boolean;
  align?: SpreadsheetHorizontalAlign;
  numberFormat?: string;
}>;

export type SpreadsheetCellStyleContext<TRecord, TColumnKey extends string> =
  Readonly<{
    record: TRecord;
    rowIndex: number;
    columnIndex: number;
    columnKey: TColumnKey;
  }>;

export interface FileDownloadGateway {
  download(blob: Blob, fileName: string): void;
}

export type XlsxModule = typeof import("xlsx-js-style");

export interface XlsxModuleResolver {
  resolve(): Promise<XlsxModule>;
}
