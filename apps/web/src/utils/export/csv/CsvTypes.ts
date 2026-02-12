export type CsvScalar = string | number | boolean | null | undefined;

export interface CsvColumnBlueprint<TRecord> {
  key: string;
  header: string;
  resolve: (record: TRecord) => CsvScalar;
  format?: (value: CsvScalar, record: TRecord) => CsvScalar;
}

export interface CsvBuildOptions {
  delimiter?: string;
  lineBreak?: string;
  includeBom?: boolean;
}
