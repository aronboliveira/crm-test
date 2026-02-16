<script setup lang="ts">
/**
 * @fileoverview Generic import modal for CSV/JSON/XML file imports.
 *
 * Supports mass import and single-record form prefill modes.
 * Reusable across entities (tasks, leads, projects, etc.).
 *
 * @module components/import/GenericImportModal
 */
import { ref, computed } from "vue";
import ClientImportProgressService, {
  CLIENT_IMPORT_STEPS,
} from "../../services/ClientImportProgressService";
import AlertService from "../../services/AlertService";

/* -------------------------------------------------------------------------- */
/*  Props & Emits                                                              */
/* -------------------------------------------------------------------------- */

export interface GenericImportModalProps<TService> {
  /** Import mode: 'mass' for bulk import, 'single' for form fill */
  mode?: "mass" | "single";
  /** Service instance for import operations */
  service: TService;
  /** Entity label (e.g., "Tarefas", "Leads") */
  entityLabel: string;
  /** Field to display in preview (e.g., "title", "name") */
  displayField: string;
  singleParseMethod?: string;
}

const props = withDefaults(defineProps<GenericImportModalProps<any>>(), {
  mode: "mass",
  singleParseMethod: "parseForSingle",
});

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    data: { imported: number; shouldRefresh: boolean; draft?: any },
  ): void;
}>();

/* -------------------------------------------------------------------------- */
/*  State                                                                      */
/* -------------------------------------------------------------------------- */

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const isProcessing = ref(false);
const currentStep = ref<"select" | "preview" | "complete">("select");
const errorMessage = ref("");

const parseResult = ref<any | null>(null);
const submitResult = ref<any | null>(null);
const singleDraft = ref<any | null>(null);

/* -------------------------------------------------------------------------- */
/*  Computed                                                                   */
/* -------------------------------------------------------------------------- */

const isMassMode = computed(() => props.mode === "mass");

const modalTitle = computed(() => {
  if (isMassMode.value) {
    return currentStep.value === "preview"
      ? `Prévia da Importação - ${props.entityLabel}`
      : currentStep.value === "complete"
        ? "Importação Concluída"
        : `Importar ${props.entityLabel} em Massa`;
  }
  return `Importar ${props.entityLabel.slice(0, -1)} de Arquivo`;
});

const acceptedExtensions = computed(() =>
  props.service.getAcceptedExtensions(),
);

const validRows = computed(() => {
  if (!parseResult.value) return [];
  return parseResult.value.parsedRows.filter((row: any) => row.isValid);
});

const invalidRows = computed(() => {
  if (!parseResult.value) return [];
  return parseResult.value.parsedRows.filter((row: any) => !row.isValid);
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
    CLIENT_IMPORT_STEPS.massImport().slice(0, 4),
  );

  try {
    await progress.open("Processando Arquivo");

    const result = await props.service.parseAndValidate(file, {
      onReadStart: () => progress.markRunning("read"),
      onReadComplete: (name: string) => progress.markDone("read", name),
      onParseStart: () => progress.markRunning("parse"),
      onParseComplete: (count: number) =>
        progress.markDone("parse", `${count} linhas`),
      onValidateStart: (total: number) => {
        progress.markRunning("validate");
        progress.setTotalRows(total);
      },
      onValidateProgress: (processed: number, total: number) => {
        progress.setRowProgress(processed, total);
      },
      onValidateComplete: (valid: number, invalid: number) => {
        progress.markDone("validate", `${valid} válidos, ${invalid} inválidos`);
      },
      onError: (err: Error) => {
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

    const methodName = props.singleParseMethod;
    const draft = await props.service[methodName](file, {
      onReadStart: () => progress.markRunning("read"),
      onReadComplete: (name: string) => progress.markDone("read", name),
      onParseStart: () => progress.markRunning("parse"),
      onParseComplete: () => progress.markDone("parse"),
      onError: (err: Error) => {
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
      `Dados prontos para edição.`,
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
    await progress.open(`Importando ${props.entityLabel}`);
    progress.markRunning("submit");
    progress.setTotalRows(validRows.value.length);

    const result = await props.service.submitValidRows(
      parseResult.value.parsedRows,
      {
        onSubmitStart: (total: number) => progress.setTotalRows(total),
        onSubmitProgress: (processed: number, total: number) => {
          progress.setRowProgress(processed, total);
        },
        onSubmitComplete: (success: number, failed: number) => {
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
      `${result.successCount} registro(s) criado(s) com sucesso.`,
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
    imported: 0,
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
</script>

<template>
  <section class="generic-import-modal">
    <header class="generic-import-modal__header">
      <h3 class="generic-import-modal__title">{{ modalTitle }}</h3>
      <p v-if="currentStep === 'select'" class="generic-import-modal__subtitle">
        {{
          isMassMode
            ? `Selecione um arquivo CSV, JSON ou XML para importar múltiplos ${entityLabel.toLowerCase()}.`
            : `Selecione um arquivo para preencher o formulário de ${entityLabel.toLowerCase()}.`
        }}
      </p>
    </header>

    <!-- Step 1: File Selection -->
    <div v-if="currentStep === 'select'" class="generic-import-modal__content">
      <input
        ref="fileInput"
        type="file"
        :accept="acceptedExtensions"
        class="visually-hidden"
        @change="onFileInputChange"
      />

      <div
        class="generic-import-dropzone"
        :class="{ 'generic-import-dropzone--active': isDragOver }"
        role="button"
        tabindex="0"
        @click="triggerFileSelect"
        @keydown.enter="triggerFileSelect"
        @keydown.space.prevent="triggerFileSelect"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="generic-import-dropzone__icon">
          <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
        </div>
        <p class="generic-import-dropzone__text">
          Arraste e solte seu arquivo aqui ou
          <span class="generic-import-dropzone__link"
            >clique para selecionar</span
          >
        </p>
        <p class="generic-import-dropzone__formats">
          Formatos aceitos: CSV, JSON, XML
        </p>
      </div>

      <div
        v-if="selectedFile && isProcessing"
        class="generic-import-processing"
      >
        <span class="generic-import-spinner" aria-hidden="true"></span>
        <span>Processando {{ selectedFile.name }}...</span>
      </div>

      <div v-if="errorMessage" class="generic-import-error" role="alert">
        <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Step 2: Preview (Mass Mode) -->
    <div
      v-if="currentStep === 'preview' && isMassMode && parseResult"
      class="generic-import-modal__content"
    >
      <div class="generic-import-summary">
        <div
          class="generic-import-summary__item generic-import-summary__item--success"
        >
          <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span class="generic-import-summary__count">{{
            parseResult.validCount
          }}</span>
          <span class="generic-import-summary__label">Válidos</span>
        </div>
        <div
          v-if="parseResult.invalidCount > 0"
          class="generic-import-summary__item generic-import-summary__item--error"
        >
          <i class="bi bi-x-circle-fill" aria-hidden="true"></i>
          <span class="generic-import-summary__count">{{
            parseResult.invalidCount
          }}</span>
          <span class="generic-import-summary__label">Inválidos</span>
        </div>
        <div class="generic-import-summary__item">
          <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
          <span class="generic-import-summary__count">{{
            parseResult.totalRows
          }}</span>
          <span class="generic-import-summary__label">Total</span>
        </div>
      </div>

      <!-- Valid Rows Preview -->
      <div v-if="validRows.length > 0" class="generic-import-preview">
        <h4 class="generic-import-preview__title">
          <i class="bi bi-check-circle" aria-hidden="true"></i>
          Registros Válidos ({{ validRows.length }})
        </h4>
        <div class="generic-import-preview__table-container">
          <table class="generic-import-preview__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ displayField }}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in validRows.slice(0, 10)"
                :key="row.rowNumber"
                class="generic-import-preview__row generic-import-preview__row--valid"
              >
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.draft[displayField] || "—" }}</td>
                <td><i class="bi bi-check-circle-fill text-success"></i></td>
              </tr>
            </tbody>
          </table>
          <p v-if="validRows.length > 10" class="generic-import-preview__more">
            E mais {{ validRows.length - 10 }} registros válidos...
          </p>
        </div>
      </div>

      <!-- Invalid Rows Preview -->
      <div
        v-if="invalidRows.length > 0"
        class="generic-import-preview generic-import-preview--errors"
      >
        <h4
          class="generic-import-preview__title generic-import-preview__title--error"
        >
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          Registros com Erros ({{ invalidRows.length }})
        </h4>
        <div class="generic-import-preview__table-container">
          <table class="generic-import-preview__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ displayField }}</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in invalidRows.slice(0, 5)"
                :key="row.rowNumber"
                class="generic-import-preview__row generic-import-preview__row--invalid"
              >
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.draft[displayField] || "(sem nome)" }}</td>
                <td>
                  <ul class="generic-import-preview__errors">
                    <li v-for="(err, idx) in row.errors" :key="idx">
                      <strong>{{ err.field }}:</strong> {{ err.message }}
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="invalidRows.length > 5" class="generic-import-preview__more">
            E mais {{ invalidRows.length - 5 }} registros com erros...
          </p>
        </div>
      </div>
    </div>

    <!-- Step 2: Preview (Single Mode) -->
    <div
      v-if="currentStep === 'preview' && !isMassMode && singleDraft"
      class="generic-import-modal__content"
    >
      <div class="generic-import-single-preview">
        <h4 class="generic-import-single-preview__title">
          <i class="bi bi-person-check" aria-hidden="true"></i>
          Dados Carregados
        </h4>
        <dl class="generic-import-single-preview__details">
          <div
            v-for="(value, key) in singleDraft"
            :key="String(key)"
            class="generic-import-single-preview__item"
          >
            <dt>{{ key }}</dt>
            <dd>{{ value || "—" }}</dd>
          </div>
        </dl>
        <p class="generic-import-single-preview__note">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          Esses dados serão usados para preencher o formulário.
        </p>
      </div>
    </div>

    <!-- Footer Actions -->
    <footer class="generic-import-modal__footer">
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

      <div class="generic-import-modal__footer-right">
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
          Importar {{ validRows.length }} Registro(s)
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
@use "../../styles/components/client-import-modal.module" as import-styles;

.generic-import-modal {
  @extend .client-import-modal;
}

.generic-import-modal__header {
  @extend .client-import-modal__header;
}

.generic-import-modal__title {
  @extend .client-import-modal__title;
}

.generic-import-modal__subtitle {
  @extend .client-import-modal__subtitle;
}

.generic-import-modal__content {
  @extend .client-import-modal__content;
}

.generic-import-modal__footer {
  @extend .client-import-modal__footer;
}

.generic-import-modal__footer-right {
  @extend .client-import-modal__footer-right;
}

.generic-import-dropzone {
  @extend .client-import-dropzone;

  &--active {
    @extend .client-import-dropzone--active;
  }

  &__icon {
    @extend .client-import-dropzone__icon;
  }

  &__text {
    @extend .client-import-dropzone__text;
  }

  &__link {
    @extend .client-import-dropzone__link;
  }

  &__formats {
    @extend .client-import-dropzone__formats;
  }
}

.generic-import-processing {
  @extend .client-import-processing;
}

.generic-import-spinner {
  @extend .client-import-spinner;
}

.generic-import-error {
  @extend .client-import-error;
}

.generic-import-summary {
  @extend .client-import-summary;

  &__item {
    @extend .client-import-summary__item;

    &--success {
      @extend .client-import-summary__item--success;
    }

    &--error {
      @extend .client-import-summary__item--error;
    }
  }

  &__count {
    @extend .client-import-summary__count;
  }

  &__label {
    @extend .client-import-summary__label;
  }
}

.generic-import-preview {
  @extend .client-import-preview;

  &--errors {
    @extend .client-import-preview--errors;
  }

  &__title {
    @extend .client-import-preview__title;

    &--error {
      @extend .client-import-preview__title--error;
    }
  }

  &__table-container {
    @extend .client-import-preview__table-container;
  }

  &__table {
    @extend .client-import-preview__table;
  }

  &__row {
    @extend .client-import-preview__row;

    &--valid {
      @extend .client-import-preview__row--valid;
    }

    &--invalid {
      @extend .client-import-preview__row--invalid;
    }
  }

  &__errors {
    @extend .client-import-preview__errors;
  }

  &__more {
    @extend .client-import-preview__more;
  }
}

.generic-import-single-preview {
  @extend .client-import-single-preview;

  &__title {
    @extend .client-import-single-preview__title;
  }

  &__details {
    @extend .client-import-single-preview__details;
  }

  &__item {
    @extend .client-import-single-preview__item;
  }

  &__note {
    @extend .client-import-single-preview__note;
  }
}
</style>
