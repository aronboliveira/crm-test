import type { ParsedImportDocument } from "../ImportSourceTypes";
import type { ImportDocumentParser } from "./ImportDocumentParser";

const CSV_MIME_HINTS = ["text/csv", "application/csv", "text/plain"] as const;

export class CsvImportDocumentParser implements ImportDocumentParser {
  readonly format = "csv" as const;

  canParse(file: { name: string; type?: string }): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "csv") return true;
    const mime = (file.type ?? "").toLowerCase();
    return CSV_MIME_HINTS.some((hint) => mime.includes(hint));
  }

  parse(content: string): ParsedImportDocument {
    const sanitized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
    if (!sanitized) {
      throw new Error("Arquivo CSV vazio.");
    }

    const delimiter = this.detectDelimiter(sanitized);
    const rows = this.parseRows(sanitized, delimiter);
    if (!rows.length) {
      throw new Error("CSV sem linhas utilizáveis.");
    }

    const headers = this.buildHeaders(rows[0] ?? []);
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));

    return {
      format: this.format,
      rows: dataRows.map((row) => this.buildRecord(headers, row)),
      warnings: [],
      rowNumberOffset: 2,
    };
  }

  private detectDelimiter(content: string): string {
    const sample = content.split("\n").slice(0, 5).join("\n");
    const candidates: Array<{ delimiter: string; score: number }> = [
      { delimiter: ",", score: (sample.match(/,/g) ?? []).length },
      { delimiter: ";", score: (sample.match(/;/g) ?? []).length },
      { delimiter: "\t", score: (sample.match(/\t/g) ?? []).length },
    ];
    candidates.sort((left, right) => right.score - left.score);
    return candidates[0]?.score ? candidates[0].delimiter : ",";
  }

  private parseRows(content: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      if (char === undefined) continue;

      if (insideQuotes) {
        if (char === "\"") {
          if (content[index + 1] === "\"") {
            currentCell += "\"";
            index += 1;
          } else {
            insideQuotes = false;
          }
        } else {
          currentCell += char;
        }
        continue;
      }

      if (char === "\"") {
        insideQuotes = true;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = "";
        continue;
      }

      if (char === "\n") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        continue;
      }

      currentCell += char;
    }

    currentRow.push(currentCell.trim());
    rows.push(currentRow);
    return rows;
  }

  private buildHeaders(rawHeaders: readonly string[]): string[] {
    const seen = new Map<string, number>();
    return rawHeaders.map((value, index) => {
      const base = value.trim() || `column_${index + 1}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return count === 1 ? base : `${base}_${count}`;
    });
  }

  private buildRecord(
    headers: readonly string[],
    row: readonly string[],
  ): Record<string, string> {
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = String(row[index] ?? "").trim();
      return record;
    }, {});
  }
}
