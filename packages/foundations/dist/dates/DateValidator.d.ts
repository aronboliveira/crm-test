export default class DateValidator {
    #private;
    static isIso(v: unknown): v is string;
    static parseIso(v: unknown): Date | null;
    static normalizeIso(v: unknown): string | null;
    static compareIso(a: unknown, b: unknown): number;
    static ms(iso: unknown): number;
}
