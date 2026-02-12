<script setup lang="ts">
import { computed, ref } from "vue";
import styles from "./DashboardClientsExportModal.module.scss";
import {
  DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS,
  type DashboardClientsExportColumnKey,
} from "../../utils/export";

type ExportFormat = "csv" | "xlsx";
type ClientLifecycleStage =
  | "Prospect"
  | "Ativo"
  | "Expansão"
  | "Em Risco"
  | "Inativo";

type DashboardClientsExportDialogResult = {
  formats: ExportFormat[];
  columnKeys: DashboardClientsExportColumnKey[];
  lifecycleStages: ClientLifecycleStage[];
  onlyWithWhatsapp: boolean;
};

type ExportColumnDefinition = {
  key: DashboardClientsExportColumnKey;
  label: string;
};

const EXPORT_COLUMNS: readonly ExportColumnDefinition[] = [
  { key: "nome", label: "Nome" },
  { key: "tipo", label: "Tipo" },
  { key: "empresa", label: "Empresa" },
  { key: "cnpj", label: "CNPJ" },
  { key: "cep", label: "CEP" },
  { key: "lifecycle", label: "Lifecycle" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "whatsappEngagement", label: "Engaj. WhatsApp (%)" },
  { key: "emailEngagement", label: "Engaj. E-mail (%)" },
  { key: "projetos", label: "Projetos" },
] as const;

const LIFECYCLE_OPTIONS: readonly ClientLifecycleStage[] = [
  "Prospect",
  "Ativo",
  "Expansão",
  "Em Risco",
  "Inativo",
] as const;

interface Props {
  totalRows?: number;
  defaultFormats?: ExportFormat[];
  defaultColumnKeys?: DashboardClientsExportColumnKey[];
  defaultLifecycleStages?: ClientLifecycleStage[];
  defaultOnlyWithWhatsapp?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  totalRows: 0,
  defaultFormats: () => ["csv", "xlsx"] as ExportFormat[],
  defaultColumnKeys: () =>
    [...DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS] as DashboardClientsExportColumnKey[],
  defaultLifecycleStages: () =>
    ["Prospect", "Ativo", "Expansão", "Em Risco", "Inativo"] as ClientLifecycleStage[],
  defaultOnlyWithWhatsapp: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", payload: DashboardClientsExportDialogResult): void;
}>();

const selectedFormats = ref<ExportFormat[]>([...props.defaultFormats]);
const selectedColumnKeys = ref<DashboardClientsExportColumnKey[]>([
  ...props.defaultColumnKeys,
]);
const selectedLifecycleStages = ref<ClientLifecycleStage[]>([
  ...props.defaultLifecycleStages,
]);
const onlyWithWhatsapp = ref<boolean>(props.defaultOnlyWithWhatsapp);
const validationError = ref<string>("");

const selectedSummary = computed(
  () =>
    `${selectedColumnKeys.value.length} coluna(s), ${selectedLifecycleStages.value.length} estágio(s), ${selectedFormats.value.length} formato(s)`,
);

const isFormatSelected = (format: ExportFormat): boolean =>
  selectedFormats.value.includes(format);

const isColumnSelected = (key: DashboardClientsExportColumnKey): boolean =>
  selectedColumnKeys.value.includes(key);

const toggleFormat = (format: ExportFormat): void => {
  validationError.value = "";
  if (isFormatSelected(format)) {
    if (selectedFormats.value.length === 1) return;
    selectedFormats.value = selectedFormats.value.filter((f) => f !== format);
    return;
  }
  selectedFormats.value = [...selectedFormats.value, format];
};

const toggleColumn = (key: DashboardClientsExportColumnKey): void => {
  validationError.value = "";
  if (isColumnSelected(key)) {
    if (selectedColumnKeys.value.length === 1) return;
    selectedColumnKeys.value = selectedColumnKeys.value.filter((c) => c !== key);
    return;
  }
  selectedColumnKeys.value = [...selectedColumnKeys.value, key];
};

const enableAllColumns = (): void => {
  validationError.value = "";
  selectedColumnKeys.value = [...DASHBOARD_CLIENTS_EXPORT_COLUMN_KEYS];
};

const handleLifecycleSelectChange = (event: Event): void => {
  validationError.value = "";
  const select = event.target as HTMLSelectElement;
  const values = Array.from(select.selectedOptions).map(
    (option) => option.value as ClientLifecycleStage,
  );
  if (!values.length) {
    selectedLifecycleStages.value = [...LIFECYCLE_OPTIONS];
    return;
  }
  selectedLifecycleStages.value = values;
};

const toggleAllLifecycles = (): void => {
  validationError.value = "";
  selectedLifecycleStages.value = [...LIFECYCLE_OPTIONS];
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
  if (!selectedLifecycleStages.value.length) {
    validationError.value = "Selecione ao menos um estágio de lifecycle.";
    return;
  }

  emit("confirm", {
    formats: [...selectedFormats.value],
    columnKeys: [...selectedColumnKeys.value],
    lifecycleStages: [...selectedLifecycleStages.value],
    onlyWithWhatsapp: onlyWithWhatsapp.value,
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
          v-for="column in EXPORT_COLUMNS"
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

    <section :class="styles.section">
      <div :class="styles.sectionHead">
        <h3 :class="styles.sectionTitle">Lifecycle</h3>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          title="Selecionar todos os estágios"
          @click="toggleAllLifecycles"
        >
          Todos
        </button>
      </div>
      <select
        :class="styles.lifecycleSelect"
        multiple
        :value="selectedLifecycleStages"
        @change="handleLifecycleSelectChange"
      >
        <option v-for="stage in LIFECYCLE_OPTIONS" :key="stage" :value="stage">
          {{ stage }}
        </option>
      </select>

      <label :class="[styles.choiceItem, onlyWithWhatsapp && styles.choiceItemActive]">
        <input
          type="checkbox"
          :checked="onlyWithWhatsapp"
          @change="onlyWithWhatsapp = !onlyWithWhatsapp"
        />
        <span>Somente clientes com WhatsApp</span>
      </label>
    </section>

    <p :class="styles.summary">
      {{ props.totalRows }} cliente(s) disponíveis • {{ selectedSummary }}
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
