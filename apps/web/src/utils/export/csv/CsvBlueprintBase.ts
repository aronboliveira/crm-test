import type { CsvColumnBlueprint, CsvScalar } from "./CsvTypes";

type CsvSerializable = string | number | boolean;

export abstract class CsvBlueprintBase<TRecord> {
  protected abstract readonly columns: readonly CsvColumnBlueprint<TRecord>[];

  public getHeaders(): string[] {
    return this.columns.map((column) => column.header);
  }

  public toAoa(records: readonly TRecord[]): CsvSerializable[][] {
    return [
      this.getHeaders(),
      ...records.map((record) => this.toRawRow(record)),
    ];
  }

  protected toRawRow(record: TRecord): CsvSerializable[] {
    return this.columns.map((column) =>
      this.normalizeScalar(this.resolveColumnValue(column, record)),
    );
  }

  private resolveColumnValue(
    column: CsvColumnBlueprint<TRecord>,
    record: TRecord,
  ): CsvScalar {
    const rawValue = column.resolve(record);
    return column.format ? column.format(rawValue, record) : rawValue;
  }

  private normalizeScalar(value: CsvScalar): CsvSerializable {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    return value;
  }
}
