export class ExportFileNameFactory {
  private readonly dateProvider: () => Date;

  public constructor(dateProvider: () => Date = () => new Date()) {
    this.dateProvider = dateProvider;
  }

  public build(baseName: string, extension: string): string {
    const normalizedExtension = extension.trim().replace(/^\./, "").toLowerCase();
    const suffix = this.toDateSuffix(this.dateProvider());
    return `${baseName}-${suffix}.${normalizedExtension}`;
  }

  private toDateSuffix(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }
}
