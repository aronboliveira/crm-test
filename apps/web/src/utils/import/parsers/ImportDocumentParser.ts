import type {
  ImportSourceFileLike,
  ImportSourceFormat,
  ParsedImportDocument,
} from "../ImportSourceTypes";

export interface ImportDocumentParser {
  readonly format: ImportSourceFormat;
  canParse(file: Pick<ImportSourceFileLike, "name" | "type">): boolean;
  parse(content: string): ParsedImportDocument;
}
