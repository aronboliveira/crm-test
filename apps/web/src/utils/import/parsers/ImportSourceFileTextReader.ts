import type { ImportSourceFileLike } from "../ImportSourceTypes";

export interface ImportSourceFileTextReader {
  read(file: ImportSourceFileLike): Promise<string>;
}

export class BrowserImportSourceFileTextReader
  implements ImportSourceFileTextReader
{
  async read(file: ImportSourceFileLike): Promise<string> {
    return file.text();
  }
}
