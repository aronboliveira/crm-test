import type { FileDownloadGateway } from "./SpreadsheetTypes";

export class BrowserFileDownloadGateway implements FileDownloadGateway {
  public download(blob: Blob, fileName: string): void {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      throw new Error("Browser download APIs are unavailable in this runtime.");
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
