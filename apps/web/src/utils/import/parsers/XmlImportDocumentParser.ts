import type { ParsedImportDocument } from "../ImportSourceTypes";
import type { ImportDocumentParser } from "./ImportDocumentParser";

const XML_MIME_HINTS = ["application/xml", "text/xml"] as const;
const XML_ENTITY_MAP: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#39;": "'",
};

type XmlBlock = Readonly<{
  tag: string;
  content: string;
}>;

export class XmlImportDocumentParser implements ImportDocumentParser {
  readonly format = "xml" as const;

  canParse(file: { name: string; type?: string }): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension === "xml") return true;
    const mime = (file.type ?? "").toLowerCase();
    return XML_MIME_HINTS.some((hint) => mime.includes(hint));
  }

  parse(content: string): ParsedImportDocument {
    const sanitized = content.replace(/^\uFEFF/, "").trim();
    if (!sanitized) {
      throw new Error("Arquivo XML vazio.");
    }

    const rows = this.parseWithDomParser(sanitized) ?? this.parseWithRegex(sanitized);
    if (!rows.length) {
      throw new Error("XML sem nós reconhecidos para importação.");
    }

    return {
      format: this.format,
      rows,
      warnings: [],
      rowNumberOffset: 1,
    };
  }

  private parseWithDomParser(content: string): Array<Record<string, string>> | null {
    if (typeof DOMParser === "undefined") return null;

    try {
      const parser = new DOMParser();
      const document = parser.parseFromString(content, "application/xml");
      if (document.querySelector("parsererror")) {
        throw new Error("XML malformado.");
      }

      const root = document.documentElement;
      if (!root) return [];

      const childElements = Array.from(root.children);
      const repeatedTag = this.pickRepeatedTag(
        childElements.map((node) => node.tagName.toLowerCase()),
      );
      const recordNodes = repeatedTag
        ? childElements.filter(
            (node) => node.tagName.toLowerCase() === repeatedTag,
          )
        : childElements;

      return recordNodes.map((node) => this.elementToRecord(node));
    } catch {
      return null;
    }
  }

  private elementToRecord(element: Element): Record<string, string> {
    const children = Array.from(element.children);
    if (!children.length) {
      return {
        [element.tagName]: this.normalizeXmlText(element.textContent ?? ""),
      };
    }

    const counter = new Map<string, number>();
    return children.reduce<Record<string, string>>((record, child) => {
      const key = child.tagName;
      const count = (counter.get(key) ?? 0) + 1;
      counter.set(key, count);
      const normalizedKey = count === 1 ? key : `${key}_${count}`;
      record[normalizedKey] = this.normalizeXmlText(child.textContent ?? "");
      return record;
    }, {});
  }

  private parseWithRegex(content: string): Array<Record<string, string>> {
    const cleanContent = content
      .replace(/<\?xml[^>]*\?>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();

    const rootMatch = cleanContent.match(
      /^<([A-Za-z_][A-Za-z0-9:._-]*)\b[^>]*>([\s\S]*)<\/\1>\s*$/,
    );
    const rootBody = rootMatch ? rootMatch[2] ?? "" : cleanContent;

    const blocks = this.collectBlocks(rootBody);
    const repeatedTag = this.pickRepeatedTag(blocks.map((block) => block.tag));
    const recordBlocks = repeatedTag
      ? blocks.filter((block) => block.tag === repeatedTag)
      : blocks;

    return recordBlocks.map((block) => {
      const childBlocks = this.collectBlocks(block.content);
      if (!childBlocks.length) {
        return {
          [block.tag]: this.normalizeXmlText(block.content),
        };
      }

      const counter = new Map<string, number>();
      return childBlocks.reduce<Record<string, string>>((record, child) => {
        const count = (counter.get(child.tag) ?? 0) + 1;
        counter.set(child.tag, count);
        const key = count === 1 ? child.tag : `${child.tag}_${count}`;
        record[key] = this.normalizeXmlText(child.content);
        return record;
      }, {});
    });
  }

  private collectBlocks(content: string): XmlBlock[] {
    const blocks: XmlBlock[] = [];
    const pattern = /<([A-Za-z_][A-Za-z0-9:._-]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let match: RegExpExecArray | null = pattern.exec(content);
    while (match) {
      blocks.push({
        tag: match[1] ?? "field",
        content: match[2] ?? "",
      });
      match = pattern.exec(content);
    }
    return blocks;
  }

  private pickRepeatedTag(tags: readonly string[]): string | null {
    const countByTag = new Map<string, number>();
    tags.forEach((tag) => {
      countByTag.set(tag, (countByTag.get(tag) ?? 0) + 1);
    });
    const repeated = Array.from(countByTag.entries()).find((entry) => entry[1] > 1);
    return repeated?.[0] ?? null;
  }

  private normalizeXmlText(value: string): string {
    const withoutTags = value.replace(/<[^>]*>/g, " ");
    const decoded = Object.entries(XML_ENTITY_MAP).reduce(
      (current, [entity, plain]) => current.replaceAll(entity, plain),
      withoutTags,
    );
    return decoded.replace(/\s+/g, " ").trim();
  }
}
