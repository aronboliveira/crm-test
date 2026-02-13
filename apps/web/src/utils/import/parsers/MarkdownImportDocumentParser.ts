import type { ParsedImportDocument } from "../ImportSourceTypes";
import type { ImportDocumentParser } from "./ImportDocumentParser";

const MARKDOWN_MIME_HINTS = ["text/markdown", "text/x-markdown"] as const;

export class MarkdownImportDocumentParser implements ImportDocumentParser {
  readonly format = "md" as const;

  canParse(file: { name: string; type?: string }): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "md" || extension === "markdown") return true;
    const mime = (file.type ?? "").toLowerCase();
    return MARKDOWN_MIME_HINTS.some((hint) => mime.includes(hint));
  }

  parse(content: string): ParsedImportDocument {
    const sanitized = content.replace(/^\uFEFF/, "").trim();
    if (!sanitized) {
      throw new Error("Arquivo Markdown vazio.");
    }

    const rowsFromTable = this.parseTable(sanitized);
    if (rowsFromTable.length > 0) {
      return {
        format: this.format,
        rows: rowsFromTable,
        warnings: [],
        rowNumberOffset: 3,
      };
    }

    const rowsFromBlocks = this.parseKeyValueBlocks(sanitized);
    if (rowsFromBlocks.length > 0) {
      return {
        format: this.format,
        rows: rowsFromBlocks,
        warnings: [
          "Markdown em bloco chave:valor detectado. Revise os dados antes de aprovar.",
        ],
        rowNumberOffset: 1,
      };
    }

    throw new Error("Markdown sem estrutura reconhecida para importação.");
  }

  private parseTable(content: string): Array<Record<string, string>> {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes("|"));
    if (lines.length < 3) return [];

    const headers = this.splitRow(lines[0] ?? "").map((value) => value.toLowerCase());
    const separator = this.splitRow(lines[1] ?? "");
    const isSeparator = separator.length === headers.length &&
      separator.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (!isSeparator) return [];

    const rows: Array<Record<string, string>> = [];
    for (let index = 2; index < lines.length; index += 1) {
      const rowValues = this.splitRow(lines[index] ?? "");
      if (!rowValues.some((value) => value)) continue;
      const row = headers.reduce<Record<string, string>>((record, header, column) => {
        record[header] = String(rowValues[column] ?? "").trim();
        return record;
      }, {});
      rows.push(row);
    }
    return rows;
  }

  private splitRow(line: string): string[] {
    return line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  private parseKeyValueBlocks(content: string): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];
    let current: Record<string, string> = {};

    const pushCurrent = () => {
      if (Object.keys(current).length > 0) {
        rows.push(current);
        current = {};
      }
    };

    content.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || /^#{1,6}\s+/.test(line)) {
        pushCurrent();
        return;
      }
      const normalized = line.replace(/^[-*]\s+/, "");
      const keyValue = normalized.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!keyValue) return;
      const key = keyValue[1]?.trim().toLowerCase().replace(/\s+/g, "_");
      const value = keyValue[2]?.trim() ?? "";
      if (!key || !value) return;
      current[key] = value;
    });

    pushCurrent();
    return rows;
  }
}
