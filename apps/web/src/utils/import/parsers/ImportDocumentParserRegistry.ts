import type { ImportSourceFileLike } from "../ImportSourceTypes";
import { CsvImportDocumentParser } from "./CsvImportDocumentParser";
import type { ImportDocumentParser } from "./ImportDocumentParser";
import { JsonImportDocumentParser } from "./JsonImportDocumentParser";
import { PdfImportDocumentParser } from "./PdfImportDocumentParser";
import { XmlImportDocumentParser } from "./XmlImportDocumentParser";

export class ImportDocumentParserRegistry {
  private readonly parsers: readonly ImportDocumentParser[];

  constructor(parsers?: readonly ImportDocumentParser[]) {
    this.parsers =
      parsers ??
      [
        new CsvImportDocumentParser(),
        new JsonImportDocumentParser(),
        new XmlImportDocumentParser(),
        new PdfImportDocumentParser(),
      ];
  }

  resolve(file: Pick<ImportSourceFileLike, "name" | "type">): ImportDocumentParser {
    const parser = this.parsers.find((candidate) => candidate.canParse(file));
    if (!parser) {
      throw new Error(
        "Formato não suportado. Use JSON, CSV, XML ou PDF (modo assistido).",
      );
    }
    return parser;
  }

  listFormats(): string[] {
    return this.parsers.map((parser) => parser.format);
  }
}
