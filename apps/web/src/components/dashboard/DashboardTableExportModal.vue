<script setup lang="ts">
import { computed, ref } from "vue";
import styles from "./DashboardTableExportModal.module.scss";
import type { SpreadsheetExportFormat } from "../../utils/export";

type TableExportColumnOption = Readonly<{
  key: string;
  label: string;
}>;

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

interface Props {
  totalRows?: number;
  entityLabel?: string;
  defaultFormats?: SpreadsheetExportFormat[];
  columnOptions: readonly TableExportColumnOption[];
  defaultColumnKeys?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  totalRows: 0,
  entityLabel: "registro(s)",
  defaultFormats: () => ["csv", "xlsx"] as SpreadsheetExportFormat[],
  defaultColumnKeys: () => [],
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", payload: DashboardTableExportDialogResult): void;
}>();

const allColumnKeys = computed(() => props.columnOptions.map((column) => column.key));

const selectedFormats = ref<SpreadsheetExportFormat[]>([...props.defaultFormats]);
const selectedColumnKeys = ref<string[]>(
  props.defaultColumnKeys.length ? [...props.defaultColumnKeys] : allColumnKeys.value,
);
const validationError = ref<string>("");

const selectedSummary = computed(
  () =>
    `${selectedColumnKeys.value.length} coluna(s), ${selectedFormats.value.length} formato(s)`,
);

const isFormatSelected = (format: SpreadsheetExportFormat): boolean =>
  selectedFormats.value.includes(format);

const isColumnSelected = (key: string): boolean =>
  selectedColumnKeys.value.includes(key);

const toggleFormat = (format: SpreadsheetExportFormat): void => {
  validationError.value = "";
  if (isFormatSelected(format)) {
    if (selectedFormats.value.length === 1) return;
    selectedFormats.value = selectedFormats.value.filter((item) => item !== format);
    return;
  }
  selectedFormats.value = [...selectedFormats.value, format];
};

const toggleColumn = (key: string): void => {
  validationError.value = "";
  if (isColumnSelected(key)) {
    if (selectedColumnKeys.value.length === 1) return;
    selectedColumnKeys.value = selectedColumnKeys.value.filter(
      (item) => item !== key,
    );
    return;
  }
  selectedColumnKeys.value = [...selectedColumnKeys.value, key];
};

const enableAllColumns = (): void => {
  validationError.value = "";
  selectedColumnKeys.value = [...allColumnKeys.value];
};

const submit = (): void => {
  validationError.value = "";
  if (!selectedFormats.value.length) {
    validationError.value = "Selecione ao menos um formato de exportação.";
    return;
  }
  if (!selectedColumnKeys.value.length) {
    validationError.value = "Selecione ao menos uma coluna.";
    return;
  }

  emit("confirm", {
    formats: [...selectedFormats.value],
    columnKeys: [...selectedColumnKeys.value],
  });
};
</script>

<template>
  <form :class="styles.exportModal" novalidate @submit.prevent="submit">
    <section :class="styles.section">
      <h3 :class="styles.sectionTitle">Formatos</h3>
      <div :class="styles.choiceGrid">
        <label
          :class="[styles.choiceItem, isFormatSelected('csv') && styles.choiceItemActive]"
        >
          <input
            type="checkbox"
            :checked="isFormatSelected('csv')"
            @change="toggleFormat('csv')"
          />
          <span>CSV</span>
        </label>

        <label
          :class="[styles.choiceItem, isFormatSelected('xlsx') && styles.choiceItemActive]"
        >
          <input
            type="checkbox"
            :checked="isFormatSelected('xlsx')"
            @change="toggleFormat('xlsx')"
          />
          <span>XLSX</span>
        </label>
      </div>
    </section>

    <section :class="styles.section">
      <div :class="styles.sectionHead">
        <h3 :class="styles.sectionTitle">Colunas</h3>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          title="Selecionar todas as colunas"
          @click="enableAllColumns"
        >
          Tudo
        </button>
      </div>

      <div :class="styles.columnsGrid">
        <label
          v-for="column in props.columnOptions"
          :key="column.key"
          :class="[
            styles.choiceItem,
            isColumnSelected(column.key) && styles.choiceItemActive,
          ]"
        >
          <input
            type="checkbox"
            :checked="isColumnSelected(column.key)"
            @change="toggleColumn(column.key)"
          />
          <span>{{ column.label }}</span>
        </label>
      </div>
    </section>

    <p :class="styles.summary">
      {{ props.totalRows }} {{ props.entityLabel }} disponível(is) • {{ selectedSummary }}
    </p>
    <p v-if="validationError" :class="styles.error">{{ validationError }}</p>

    <footer :class="styles.actions">
      <button class="btn btn-ghost" type="button" @click="emit('close')">
        Cancelar
      </button>
      <button class="btn btn-primary" type="submit">Exportar</button>
    </footer>
  </form>
</template>
