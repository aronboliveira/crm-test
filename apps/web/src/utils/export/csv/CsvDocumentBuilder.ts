import type { CsvBuildOptions } from "./CsvTypes";
import { CsvBlueprintBase } from "./CsvBlueprintBase";

type CsvCellValue = string | number | boolean;

const DEFAULT_CSV_OPTIONS: Required<CsvBuildOptions> = {
  delimiter: ";",
  lineBreak: "\n",
  includeBom: true,
};

export class CsvDocumentBuilder<TRecord> {
  private readonly blueprint: CsvBlueprintBase<TRecord>;
  private readonly options: Required<CsvBuildOptions>;

  public constructor(blueprint: CsvBlueprintBase<TRecord>, options?: CsvBuildOptions) {
    this.blueprint = blueprint;
    this.options = { ...DEFAULT_CSV_OPTIONS, ...options };
  }

  public build(records: readonly TRecord[]): string {
    const matrix = this.blueprint.toAoa(records);
    const content = matrix
      .map((row) => row.map((cell) => this.escapeCell(cell)).join(this.options.delimiter))
      .join(this.options.lineBreak);

    if (!this.options.includeBom) return content;
    return `\uFEFF${content}`;
  }

  private escapeCell(value: CsvCellValue): string {
    const normalized = String(value);
    const hasSpecialChars =
      normalized.includes(this.options.delimiter) ||
      normalized.includes("\n") ||
      normalized.includes("\r") ||
      normalized.includes('"');

    if (!hasSpecialChars) return normalized;
    return `"${normalized.replace(/"/g, '""')}"`;
  }
}
