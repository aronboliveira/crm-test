<script setup lang="ts">
/**
 * @fileoverview Modal for importing clients from CSV/JSON/XML files.
 *
 * Supports two modes:
 * - **Mass Import**: Upload file → parse → preview → submit all valid rows
 * - **Single Import**: Upload file → parse first row → fill form
 *
 * Features:
 * - File format detection and parsing
 * - Row-by-row validation with error display
 * - Preview table with valid/invalid indicators
 * - Progress tracking with spinner and progress bar
 * - SweetAlert feedback for success/error states
 *
 * @module components/import/ClientImportModal
 */
import { ref, computed, onMounted } from "vue";
import ClientMassImportService, {
  type ImportParseResult,
  type ImportSubmitResult,
} from "../../services/ClientMassImportService";
import ClientImportProgressService, {
  CLIENT_IMPORT_STEPS,
} from "../../services/ClientImportProgressService";
import AlertService from "../../services/AlertService";
import type { ClientImportDraft } from "../../utils/import/blueprints/ClientImportBlueprint";

/* -------------------------------------------------------------------------- */
/*  Props & Emits                                                              */
/* -------------------------------------------------------------------------- */

export interface ClientImportModalProps {
  /** Import mode: 'mass' for bulk import, 'single' for form fill */
  mode?: "mass" | "single";
}

const props = withDefaults(defineProps<ClientImportModalProps>(), {
  mode: "mass",
});

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    data: {
      imported: number;
      shouldRefresh: boolean;
      draft?: ClientImportDraft;
    },
  ): void;
}>();

/* -------------------------------------------------------------------------- */
/*  State                                                                      */
/* -------------------------------------------------------------------------- */

const importService = new ClientMassImportService();

// File input state
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);

// Processing state
const isProcessing = ref(false);
const currentStep = ref<"select" | "preview" | "complete">("select");
const errorMessage = ref("");

// Parse result state
const parseResult = ref<ImportParseResult | null>(null);
const submitResult = ref<ImportSubmitResult | null>(null);

// Single mode state (for form fill)
const singleDraft = ref<ClientImportDraft | null>(null);

/* -------------------------------------------------------------------------- */
/*  Computed                                                                   */
/* -------------------------------------------------------------------------- */

const isMassMode = computed(() => props.mode === "mass");

const modalTitle = computed(() => {
  if (isMassMode.value) {
    return currentStep.value === "preview"
      ? "Prévia da Importação"
      : currentStep.value === "complete"
        ? "Importação Concluída"
        : "Importar Clientes em Massa";
  }
  return "Importar Cliente de Arquivo";
});

const acceptedExtensions = computed(() =>
  importService.getAcceptedExtensions(),
);

const validRows = computed(() => {
  if (!parseResult.value) return [];
  return parseResult.value.parsedRows.filter((row) => row.isValid);
});

const invalidRows = computed(() => {
  if (!parseResult.value) return [];
  return parseResult.value.parsedRows.filter((row) => !row.isValid);
});

const canSubmit = computed(() => {
  return (
    parseResult.value !== null &&
    validRows.value.length > 0 &&
    !isProcessing.value
  );
});

/* -------------------------------------------------------------------------- */
/*  File Selection                                                             */
/* -------------------------------------------------------------------------- */

const triggerFileSelect = () => {
  fileInput.value?.click();
};

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await handleFileSelected(file);
  }
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await handleFileSelected(file);
  }
};

const handleFileSelected = async (file: File) => {
  // Validate file extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "json", "xml"].includes(ext ?? "")) {
    await AlertService.error(
      "Formato Inválido",
      "Por favor, selecione um arquivo CSV, JSON ou XML.",
    );
    return;
  }

  selectedFile.value = file;
  errorMessage.value = "";

  if (isMassMode.value) {
    await processMassImport(file);
  } else {
    await processSingleImport(file);
  }
};

/* -------------------------------------------------------------------------- */
/*  Mass Import Processing                                                     */
/* -------------------------------------------------------------------------- */

const processMassImport = async (file: File) => {
  isProcessing.value = true;
  errorMessage.value = "";

  const progress = new ClientImportProgressService(
    CLIENT_IMPORT_STEPS.massImport().slice(0, 4), // Only read, parse, validate, preview
  );

  try {
    await progress.open("Processando Arquivo");

    const result = await importService.parseAndValidate(file, {
      onReadStart: () => progress.markRunning("read"),
      onReadComplete: (name) => progress.markDone("read", name),
      onParseStart: () => progress.markRunning("parse"),
      onParseComplete: (count) => progress.markDone("parse", `${count} linhas`),
      onValidateStart: (total) => {
        progress.markRunning("validate");
        progress.setTotalRows(total);
      },
      onValidateProgress: (processed, total) => {
        progress.setRowProgress(processed, total);
      },
      onValidateComplete: (valid, invalid) => {
        progress.markDone("validate", `${valid} válidos, ${invalid} inválidos`);
      },
      onError: (err) => {
        progress.markError("parse", err.message);
      },
    });

    progress.markDone("preview");

    parseResult.value = result;
    currentStep.value = "preview";

    if (result.validCount === 0) {
      await progress.showValidationErrors(result.errors);
    } else {
      await progress.finish(
        result.invalidCount > 0 ? "warning" : "success",
        "Arquivo processado",
        `${result.validCount} registros válidos, ${result.invalidCount} inválidos.`,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar arquivo";
    errorMessage.value = message;
    await progress.finish("error", "Erro no Processamento", message);
  } finally {
    isProcessing.value = false;
  }
};

/* -------------------------------------------------------------------------- */
/*  Single Import Processing                                                   */
/* -------------------------------------------------------------------------- */

const processSingleImport = async (file: File) => {
  isProcessing.value = true;
  errorMessage.value = "";

  const progress = new ClientImportProgressService(
    CLIENT_IMPORT_STEPS.singleImport(),
  );

  try {
    await progress.open("Importando Dados");

    const draft = await importService.parseForSingleClient(file, {
      onReadStart: () => progress.markRunning("read"),
      onReadComplete: (name) => progress.markDone("read", name),
      onParseStart: () => progress.markRunning("parse"),
      onParseComplete: () => progress.markDone("parse"),
      onError: (err) => {
        progress.markError("parse", err.message);
      },
    });

    if (!draft) {
      await progress.finish(
        "error",
        "Arquivo Vazio",
        "Nenhum registro encontrado no arquivo.",
      );
      return;
    }

    progress.markRunning("map");
    progress.markDone("map");
    progress.markRunning("fill");
    progress.markDone("fill");

    singleDraft.value = draft;
    currentStep.value = "preview";

    await progress.finish(
      "success",
      "Dados Carregados",
      `Dados de "${draft.name || "Cliente"}" prontos para edição.`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar arquivo";
    errorMessage.value = message;
    await progress.finish("error", "Erro no Processamento", message);
  } finally {
    isProcessing.value = false;
  }
};

/* -------------------------------------------------------------------------- */
/*  Submit Mass Import                                                         */
/* -------------------------------------------------------------------------- */

const submitMassImport = async () => {
  if (!parseResult.value || validRows.value.length === 0) return;

  isProcessing.value = true;

  const progress = new ClientImportProgressService([
    { key: "submit", label: "Enviando registros" },
    { key: "refresh", label: "Finalizando" },
  ]);

  try {
    await progress.open("Importando Clientes");
    progress.markRunning("submit");
    progress.setTotalRows(validRows.value.length);

    const result = await importService.submitValidRows(
      parseResult.value.parsedRows,
      {
        onSubmitStart: (total) => progress.setTotalRows(total),
        onSubmitProgress: (processed, total) => {
          progress.setRowProgress(processed, total);
        },
        onSubmitComplete: (success, failed) => {
          progress.markDone("submit", `${success} criados, ${failed} falhas`);
        },
      },
    );

    submitResult.value = result;
    progress.markRunning("refresh");
    progress.markDone("refresh");

    currentStep.value = "complete";

    if (result.failedCount > 0) {
      await progress.showValidationErrors(result.errors);
    }

    const shouldRefresh = await progress.confirmRemount(
      "Importação Concluída",
      `${result.successCount} cliente(s) criado(s) com sucesso.`,
    );

    emit("confirm", {
      imported: result.successCount,
      shouldRefresh,
    });
    emit("close");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar registros";
    errorMessage.value = message;
    await progress.finish("error", "Erro na Importação", message);
  } finally {
    isProcessing.value = false;
  }
};

/* -------------------------------------------------------------------------- */
/*  Submit Single Import                                                       */
/* -------------------------------------------------------------------------- */

const confirmSingleImport = () => {
  if (!singleDraft.value) return;

  emit("confirm", {
    imported: 0, // Not submitted, just filling form
    shouldRefresh: false,
    draft: singleDraft.value,
  });
  emit("close");
};

/* -------------------------------------------------------------------------- */
/*  Actions                                                                    */
/* -------------------------------------------------------------------------- */

const resetToSelect = () => {
  selectedFile.value = null;
  parseResult.value = null;
  submitResult.value = null;
  singleDraft.value = null;
  errorMessage.value = "";
  currentStep.value = "select";

  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleCancel = () => {
  emit("close");
};

/* -------------------------------------------------------------------------- */
/*  Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

onMounted(() => {
  // Focus the file drop zone on mount
});
</script>

<template>
  <section class="client-import-modal">
    <header class="client-import-modal__header">
      <h3 class="client-import-modal__title">{{ modalTitle }}</h3>
      <p v-if="currentStep === 'select'" class="client-import-modal__subtitle">
        {{
          isMassMode
            ? "Selecione um arquivo CSV, JSON ou XML para importar múltiplos clientes."
            : "Selecione um arquivo para preencher o formulário de cliente."
        }}
      </p>
    </header>

    <!-- Step 1: File Selection -->
    <div v-if="currentStep === 'select'" class="client-import-modal__content">
      <input
        ref="fileInput"
        type="file"
        :accept="acceptedExtensions"
        class="visually-hidden"
        @change="onFileInputChange"
      />

      <div
        class="client-import-dropzone"
        :class="{ 'client-import-dropzone--active': isDragOver }"
        role="button"
        tabindex="0"
        @click="triggerFileSelect"
        @keydown.enter="triggerFileSelect"
        @keydown.space.prevent="triggerFileSelect"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="client-import-dropzone__icon">
          <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
        </div>
        <p class="client-import-dropzone__text">
          Arraste e solte seu arquivo aqui ou
          <span class="client-import-dropzone__link"
            >clique para selecionar</span
          >
        </p>
        <p class="client-import-dropzone__formats">
          Formatos aceitos: CSV, JSON, XML
        </p>
      </div>

      <div v-if="selectedFile && isProcessing" class="client-import-processing">
        <span class="client-import-spinner" aria-hidden="true"></span>
        <span>Processando {{ selectedFile.name }}...</span>
      </div>

      <div v-if="errorMessage" class="client-import-error" role="alert">
        <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Step 2: Preview (Mass Mode) -->
    <div
      v-if="currentStep === 'preview' && isMassMode && parseResult"
      class="client-import-modal__content"
    >
      <div class="client-import-summary">
        <div
          class="client-import-summary__item client-import-summary__item--success"
        >
          <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span class="client-import-summary__count">{{
            parseResult.validCount
          }}</span>
          <span class="client-import-summary__label">Válidos</span>
        </div>
        <div
          v-if="parseResult.invalidCount > 0"
          class="client-import-summary__item client-import-summary__item--error"
        >
          <i class="bi bi-x-circle-fill" aria-hidden="true"></i>
          <span class="client-import-summary__count">{{
            parseResult.invalidCount
          }}</span>
          <span class="client-import-summary__label">Inválidos</span>
        </div>
        <div class="client-import-summary__item">
          <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
          <span class="client-import-summary__count">{{
            parseResult.totalRows
          }}</span>
          <span class="client-import-summary__label">Total</span>
        </div>
      </div>

      <!-- Valid Rows Preview -->
      <div v-if="validRows.length > 0" class="client-import-preview">
        <h4 class="client-import-preview__title">
          <i class="bi bi-check-circle" aria-hidden="true"></i>
          Registros Válidos ({{ validRows.length }})
        </h4>
        <div class="client-import-preview__table-container">
          <table class="client-import-preview__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Telefone</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in validRows.slice(0, 10)"
                :key="row.rowNumber"
                class="client-import-preview__row client-import-preview__row--valid"
              >
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.draft.name || "—" }}</td>
                <td>
                  {{ row.draft.type === "empresa" ? "Empresa" : "Pessoa" }}
                </td>
                <td>{{ row.draft.email || "—" }}</td>
                <td>{{ row.draft.phone || row.draft.cellPhone || "—" }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="validRows.length > 10" class="client-import-preview__more">
            E mais {{ validRows.length - 10 }} registros válidos...
          </p>
        </div>
      </div>

      <!-- Invalid Rows Preview -->
      <div
        v-if="invalidRows.length > 0"
        class="client-import-preview client-import-preview--errors"
      >
        <h4
          class="client-import-preview__title client-import-preview__title--error"
        >
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          Registros com Erros ({{ invalidRows.length }})
        </h4>
        <div class="client-import-preview__table-container">
          <table class="client-import-preview__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in invalidRows.slice(0, 5)"
                :key="row.rowNumber"
                class="client-import-preview__row client-import-preview__row--invalid"
              >
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.draft.name || "(sem nome)" }}</td>
                <td>
                  <ul class="client-import-preview__errors">
                    <li v-for="(err, idx) in row.errors" :key="idx">
                      <strong>{{ err.field }}:</strong> {{ err.message }}
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="invalidRows.length > 5" class="client-import-preview__more">
            E mais {{ invalidRows.length - 5 }} registros com erros...
          </p>
        </div>
      </div>
    </div>

    <!-- Step 2: Preview (Single Mode) -->
    <div
      v-if="currentStep === 'preview' && !isMassMode && singleDraft"
      class="client-import-modal__content"
    >
      <div class="client-import-single-preview">
        <h4 class="client-import-single-preview__title">
          <i class="bi bi-person-check" aria-hidden="true"></i>
          Dados Carregados
        </h4>
        <dl class="client-import-single-preview__details">
          <div class="client-import-single-preview__item">
            <dt>Nome</dt>
            <dd>{{ singleDraft.name || "—" }}</dd>
          </div>
          <div class="client-import-single-preview__item">
            <dt>Tipo</dt>
            <dd>{{ singleDraft.type === "empresa" ? "Empresa" : "Pessoa" }}</dd>
          </div>
          <div
            v-if="singleDraft.company"
            class="client-import-single-preview__item"
          >
            <dt>Empresa</dt>
            <dd>{{ singleDraft.company }}</dd>
          </div>
          <div
            v-if="singleDraft.email"
            class="client-import-single-preview__item"
          >
            <dt>Email</dt>
            <dd>{{ singleDraft.email }}</dd>
          </div>
          <div
            v-if="singleDraft.phone || singleDraft.cellPhone"
            class="client-import-single-preview__item"
          >
            <dt>Telefone</dt>
            <dd>{{ singleDraft.phone || singleDraft.cellPhone }}</dd>
          </div>
          <div
            v-if="singleDraft.cnpj"
            class="client-import-single-preview__item"
          >
            <dt>CNPJ</dt>
            <dd>{{ singleDraft.cnpj }}</dd>
          </div>
          <div
            v-if="singleDraft.cep"
            class="client-import-single-preview__item"
          >
            <dt>CEP</dt>
            <dd>{{ singleDraft.cep }}</dd>
          </div>
        </dl>
        <p class="client-import-single-preview__note">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          Esses dados serão usados para preencher o formulário de cliente.
        </p>
      </div>
    </div>

    <!-- Footer Actions -->
    <footer class="client-import-modal__footer">
      <button
        v-if="currentStep === 'preview'"
        type="button"
        class="btn btn-ghost"
        :disabled="isProcessing"
        @click="resetToSelect"
      >
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        Voltar
      </button>

      <div class="client-import-modal__footer-right">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="isProcessing"
          @click="handleCancel"
        >
          Cancelar
        </button>

        <button
          v-if="currentStep === 'preview' && isMassMode"
          type="button"
          class="btn btn-primary"
          :disabled="!canSubmit"
          @click="submitMassImport"
        >
          <i class="bi bi-cloud-upload" aria-hidden="true"></i>
          Importar {{ validRows.length }} Cliente(s)
        </button>

        <button
          v-if="currentStep === 'preview' && !isMassMode"
          type="button"
          class="btn btn-primary"
          :disabled="!singleDraft"
          @click="confirmSingleImport"
        >
          <i class="bi bi-pencil-square" aria-hidden="true"></i>
          Usar no Formulário
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use "../../styles/components/client-import-modal.module";
</style>
