/**
 * @fileoverview Vue composable that bridges the existing import parsers
 * (`ImportDocumentParserRegistry`) with integration config forms.
 *
 * Provides reactive state for:
 * - File selection via `<input type="file">`
 * - Parsing with progress feedback via `IntegrationProgressService`
 * - Mapping parsed rows onto form fields via `IntegrationFormMapper`
 *
 * ## SOLID alignment
 * - **SRP**: Only orchestrates file→parse→map; no parsing logic.
 * - **OCP**: New integrations just supply a `FieldMappingRule[]`.
 * - **DIP**: Depends on `ImportDocumentParser` interface, not concrete parsers.
 *
 * @module composables/useIntegrationFileImport
 */
import { ref, readonly, type Ref, type DeepReadonly } from "vue";
import { ImportDocumentParserRegistry } from "../utils/import/parsers/ImportDocumentParserRegistry";
import IntegrationProgressService, {
  INTEGRATION_STEPS,
} from "../services/IntegrationProgressService";
import {
  IntegrationFormMapper,
  type FieldMappingRule,
} from "../utils/import/IntegrationFormMapper";
import AlertService from "../services/AlertService";

/** Accepted file extensions for integration config import. */
const ACCEPTED_EXTENSIONS = ".csv,.json,.xml";

export interface UseIntegrationFileImportOptions<
  TForm extends Record<string, unknown>,
> {
  /** Reactive ref to the form state to fill. */
  formRef: Ref<TForm>;
  /** Field mapping rules for this integration. */
  mappingRules: readonly FieldMappingRule[];
  /** Human-readable integration name (for progress titles). */
  integrationLabel: string;
}

export interface UseIntegrationFileImportReturn {
  /** Whether an import is currently in progress. */
  isImporting: DeepReadonly<Ref<boolean>>;
  /** Last import warning messages, if any. */
  importWarnings: DeepReadonly<Ref<readonly string[]>>;
  /** File extensions accepted by the file input. */
  acceptedExtensions: string;
  /**
   * Handle a file input change event.
   * Parses the selected file and fills the form.
   */
  handleFileImport: (event: Event) => Promise<void>;
}

/**
 * Composable factory for integration config file import.
 *
 * @example
 * ```ts
 * const { isImporting, handleFileImport, acceptedExtensions } =
 *   useIntegrationFileImport({
 *     formRef: glpiConfigForm,
 *     mappingRules: GLPI_FIELD_MAPPINGS,
 *     integrationLabel: "GLPI",
 *   });
 * ```
 */
export function useIntegrationFileImport<TForm extends Record<string, unknown>>(
  options: UseIntegrationFileImportOptions<TForm>,
): UseIntegrationFileImportReturn {
  const { formRef, mappingRules, integrationLabel } = options;

  const isImporting = ref(false);
  const importWarnings = ref<readonly string[]>([]);
  const registry = new ImportDocumentParserRegistry();
  const mapper = new IntegrationFormMapper<TForm>(mappingRules);

  const handleFileImport = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    isImporting.value = true;
    importWarnings.value = [];

    const progress = new IntegrationProgressService(
      INTEGRATION_STEPS.fileImport(),
    );

    try {
      await progress.open(`Importando para ${integrationLabel}`);

      /* Step 1: Read file */
      progress.markRunning("read");
      const textContent = await readFileAsText(file);
      progress.markDone("read");

      /* Step 2: Parse */
      progress.markRunning("parse");
      const parser = registry.resolve({ name: file.name, type: file.type });
      const parsed = parser.parse(textContent);
      progress.markDone("parse", `${parsed.rows.length} registro(s)`);

      if (parsed.warnings.length > 0) {
        importWarnings.value = parsed.warnings;
      }

      if (parsed.rows.length === 0) {
        await progress.finish(
          "error",
          "Nenhum registro encontrado",
          "O arquivo não contém dados utilizáveis para preencher o formulário.",
        );
        return;
      }

      /* Step 3: Map fields */
      progress.markRunning("map");
      const firstRow = parsed.rows[0];
      if (!firstRow) {
        await progress.finish(
          "error",
          "Nenhum registro encontrado",
          "O arquivo não contém dados utilizáveis para preencher o formulário.",
        );
        return;
      }
      const importRow = toImportRow(firstRow);
      const mapped = mapper.applyFirst([importRow], formRef.value);
      progress.markDone("map");

      /* Step 4: Fill form */
      progress.markRunning("fill");
      formRef.value = mapped;
      progress.markDone("fill");

      const filledCount = countFilledFields(mapped, formRef.value);
      await progress.finish(
        "success",
        "Importação concluída",
        `${filledCount} campo(s) preenchido(s) a partir de ${file.name}.`,
      );
    } catch (error) {
      progress.close();
      await AlertService.error(
        "Erro ao importar arquivo",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      isImporting.value = false;
      // Reset file input so the same file can be re-selected
      if (input) input.value = "";
    }
  };

  return {
    isImporting: readonly(isImporting),
    importWarnings: readonly(importWarnings),
    acceptedExtensions: ACCEPTED_EXTENSIONS,
    handleFileImport,
  };
}

/* -------------------------------------------------------------------------- */
/*  Private helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Read file content as text with vanilla ProgressEvent support.
 * Uses `FileReader` to get native progress events from the browser.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };

    reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
    reader.readAsText(file, "UTF-8");
  });
}

/** Convert an `ImportRawRecord` (string values only) to a generic import row. */
function toImportRow(
  raw: Readonly<Record<string, string>>,
): Record<string, string | number | boolean | null> {
  const row: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    row[key] = value;
  }
  return row;
}

/** Count how many form fields were actually filled by the import. */
function countFilledFields<T extends Record<string, unknown>>(
  mapped: T,
  _original: T,
): number {
  let count = 0;
  for (const value of Object.values(mapped)) {
    if (value !== null && value !== undefined && value !== "") {
      count += 1;
    }
  }
  return count;
}
