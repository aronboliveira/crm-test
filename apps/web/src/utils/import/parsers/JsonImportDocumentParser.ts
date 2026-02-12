import type {
  ImportRawRecord,
  ParsedImportDocument,
} from "../ImportSourceTypes";
import type { ImportDocumentParser } from "./ImportDocumentParser";

const JSON_MIME_HINTS = ["application/json", "text/json"] as const;

type JsonLike = Record<string, unknown> | unknown[] | string | number | boolean;

export class JsonImportDocumentParser implements ImportDocumentParser {
  readonly format = "json" as const;

  canParse(file: { name: string; type?: string }): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "json") return true;
    const mime = (file.type ?? "").toLowerCase();
    return JSON_MIME_HINTS.some((hint) => mime.includes(hint));
  }

  parse(content: string): ParsedImportDocument {
    const sanitized = content.replace(/^\uFEFF/, "").trim();
    if (!sanitized) {
      throw new Error("Arquivo JSON vazio.");
    }

    let parsed: JsonLike;
    try {
      parsed = JSON.parse(sanitized) as JsonLike;
    } catch {
      throw new Error("JSON inválido.");
    }

    const warnings: string[] = [];
    const rows = this.extractRows(parsed).map((entry, index) => {
      if (!this.isObjectRecord(entry)) {
        warnings.push(`Linha ${index + 1}: valor simples convertido para coluna "value".`);
        return { value: this.stringifyValue(entry) };
      }
      return this.recordToStringMap(entry);
    });

    if (!rows.length) {
      throw new Error("JSON sem registros para importação.");
    }

    return {
      format: this.format,
      rows,
      warnings,
      rowNumberOffset: 1,
    };
  }

  private extractRows(parsed: JsonLike): unknown[] {
    if (Array.isArray(parsed)) return parsed;
    if (!this.isObjectRecord(parsed)) return [parsed];

    const object = parsed as Record<string, unknown>;
    const listCandidate = object.items ?? object.rows ?? object.data;
    if (Array.isArray(listCandidate)) return listCandidate;

    return [object];
  }

  private recordToStringMap(record: Record<string, unknown>): ImportRawRecord {
    return Object.entries(record).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        accumulator[key] = this.stringifyValue(value);
        return accumulator;
      },
      {},
    );
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => this.stringifyValue(item)).filter(Boolean).join(", ");
    }
    if (this.isObjectRecord(value)) {
      return JSON.stringify(value);
    }
    return "";
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
