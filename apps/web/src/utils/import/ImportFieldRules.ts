export default class ImportFieldRules {
  static readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  static readonly PHONE_RE = /^\+?[0-9() \-]{7,20}$/;
  static readonly DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  static readonly CNPJ_RE = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  static readonly CEP_RE = /^\d{5}-\d{3}$/;
  static readonly CNPJ_PATTERN_ATTR = "\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}";
  static readonly CEP_PATTERN_ATTR = "\\d{5}-\\d{3}";

  static isValidEmail(value: string): boolean {
    return ImportFieldRules.EMAIL_RE.test(value.trim());
  }

  static isValidPhone(value: string): boolean {
    return ImportFieldRules.PHONE_RE.test(value.trim());
  }

  static isValidDate(value: string): boolean {
    return ImportFieldRules.DATE_RE.test(value.trim());
  }

  static isValidCnpj(value: string): boolean {
    return ImportFieldRules.CNPJ_RE.test(value.trim());
  }

  static isValidCep(value: string): boolean {
    return ImportFieldRules.CEP_RE.test(value.trim());
  }

  static normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  static normalizeCnpj(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (!digits) return "";
    if (digits.length < 14) return value.trim();
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  static normalizeCep(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (!digits) return "";
    if (digits.length < 8) return value.trim();
    return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }

  static normalizePhone(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  static normalizeTagList(value: string): string[] {
    return value
      .split(/[;,|]/)
      .map((entry) => ImportFieldRules.normalizeText(entry))
      .filter(Boolean);
  }
}
