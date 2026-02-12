import type { XlsxModule, XlsxModuleResolver } from "./SpreadsheetTypes";

export class LazyXlsxModuleResolver implements XlsxModuleResolver {
  private static xlsxModulePromise: Promise<XlsxModule> | null = null;

  public resolve(): Promise<XlsxModule> {
    if (!LazyXlsxModuleResolver.xlsxModulePromise) {
      LazyXlsxModuleResolver.xlsxModulePromise = import("xlsx-js-style")
        .then((mod) => {
          if ("utils" in mod) return mod as XlsxModule;
          return (mod as { default: XlsxModule }).default;
        })
        .catch((error) => {
          LazyXlsxModuleResolver.xlsxModulePromise = null;
          throw error;
        });
    }

    return LazyXlsxModuleResolver.xlsxModulePromise;
  }
}
