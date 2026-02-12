import { CsvBlueprintBase } from "../csv/CsvBlueprintBase";
import type { CsvColumnBlueprint } from "../csv/CsvTypes";

export type SelectableCsvColumnBlueprint<TRecord, TKey extends string> =
  CsvColumnBlueprint<TRecord> & {
    key: TKey;
  };

type SelectableCsvBlueprintOptions<TKey extends string> = {
  columns?: readonly TKey[];
};

export abstract class SelectableCsvBlueprint<TRecord, TKey extends string>
  extends CsvBlueprintBase<TRecord> {
  protected readonly columns: readonly SelectableCsvColumnBlueprint<TRecord, TKey>[];
  private readonly selectedKeys: readonly TKey[];

  protected constructor(
    allColumns: readonly SelectableCsvColumnBlueprint<TRecord, TKey>[],
    allColumnKeys: readonly TKey[],
    options: SelectableCsvBlueprintOptions<TKey> = {},
  ) {
    super();

    const selected = new Set(options.columns ?? allColumnKeys);
    const orderedKeys = allColumnKeys.filter((key) => selected.has(key));
    this.selectedKeys = orderedKeys.length ? orderedKeys : [...allColumnKeys];

    const selectedSet = new Set(this.selectedKeys);
    this.columns = allColumns.filter((column) => selectedSet.has(column.key));
  }

  public getColumnKeys(): TKey[] {
    return [...this.selectedKeys];
  }
}
