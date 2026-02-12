import type { ParsedImportDocument } from "../ImportSourceTypes";
import type { ImportDocumentParser } from "./ImportDocumentParser";

const PDF_MIME_HINTS = ["application/pdf"] as const;

export class PdfImportDocumentParser implements ImportDocumentParser {
  readonly format = "pdf" as const;

  canParse(file: { name: string; type?: string }): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "pdf") return true;
    const mime = (file.type ?? "").toLowerCase();
    return PDF_MIME_HINTS.some((hint) => mime.includes(hint));
  }

  parse(content: string): ParsedImportDocument {
    const rows = this.extractKeyValueRows(content);
    const warnings =
      rows.length > 0
        ? [
            "PDF lido em modo assistido (pares chave:valor). Revise os registros antes de aprovar.",
          ]
        : [
            "PDF detectado, mas a extração automática é limitada. Prefira converter para CSV/JSON/XML para maior precisão.",
          ];

    return {
      format: this.format,
      rows,
      warnings,
      rowNumberOffset: 1,
    };
  }

  private extractKeyValueRows(content: string): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];
    const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    let currentRow: Record<string, string> = {};
    let lastKey = "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (Object.keys(currentRow).length > 0) {
          rows.push(currentRow);
          currentRow = {};
          lastKey = "";
        }
        continue;
      }

      const keyValueMatch = line.match(/^([A-Za-z0-9À-ÿ_.\- /]+)\s*[:=]\s*(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1]?.trim();
        const value = keyValueMatch[2]?.trim() ?? "";
        if (key) {
          currentRow[key] = value;
          lastKey = key;
        }
        continue;
      }

      if (lastKey && currentRow[lastKey]) {
        currentRow[lastKey] = `${currentRow[lastKey]} ${line}`.trim();
      }
    }

    if (Object.keys(currentRow).length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }
}
