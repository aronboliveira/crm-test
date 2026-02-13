<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import ModalService from "../services/ModalService";
import type { ImportEntityKind } from "../utils/import";

type ImportCardOption = Readonly<{
  kind: ImportEntityKind;
  title: string;
  description: string;
  cta: string;
}>;

const importCards: readonly ImportCardOption[] = [
  {
    kind: "clients",
    title: "Clientes",
    description:
      "Importe clientes com validação rígida (tipo, CNPJ e CEP para Empresa).",
    cta: "Abrir formulário de clientes",
  },
  {
    kind: "projects",
    title: "Projetos",
    description:
      "Importe projetos com status, prazos e tags já na estrutura final do dashboard.",
    cta: "Abrir formulário de projetos",
  },
  {
    kind: "users",
    title: "Usuários",
    description:
      "Importe usuários com perfil/role e revisão antes de provisionar no sistema.",
    cta: "Abrir formulário de usuários",
  },
];

const ImportEntityModal = defineAsyncComponent(
  () => import("../components/import/ImportEntityModal.vue"),
);

const file = ref<File | null>(null);
const uploading = ref(false);
const resultMsg = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const legacyCollapsed = ref(true);
const manualImportSummary = ref("");

function onFileChange(ev: Event) {
  const f = (ev.target as HTMLInputElement)?.files?.[0] ?? null;
  file.value = f;
  resultMsg.value = "";
}

const openStructuredImport = async (kind: ImportEntityKind) => {
  const selected = importCards.find((card) => card.kind === kind);
  const label = selected?.title ?? "Registros";
  const result = await ModalService.open<{ kind: ImportEntityKind; imported: number }>(
    ImportEntityModal,
    {
      title: `Importar ${label}`,
      size: "xl",
      data: { kind },
    },
  );

  if (result?.imported) {
    manualImportSummary.value = `${result.imported} ${label.toLowerCase()} importado(s) com sucesso.`;
  }
};

async function submitLegacyFile() {
  if (!file.value) return;

  const ext = file.value.name.split(".").pop()?.toLowerCase();
  if (!["csv", "yml", "yaml", "xml", "json", "md", "markdown"].includes(ext || "")) {
    await AlertService.error(
      "Formato inválido",
      "Somente arquivos .csv, .yml, .yaml, .xml, .json e .md são suportados.",
    );
    return;
  }

  try {
    uploading.value = true;
    const res = await ApiClientService.import.upload(file.value);
    resultMsg.value = res.message || "Importação concluída.";
    await AlertService.success("Importação concluída", resultMsg.value);
    file.value = null;
    if (fileInput.value) fileInput.value.value = "";
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || e?.message || "Falha na importação.";
    resultMsg.value = msg;
    await AlertService.error("Falha na importação", msg);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <section class="import-page" aria-label="Importar Dados">
    <header class="import-header">
      <h1 class="import-title">Importar</h1>
      <p class="import-subtitle">
        Use formulários guiados com validação estrita, prévia e aprovação interativa
        antes de gravar no sistema. Também aceitamos JSON/CSV/XML/MD no fluxo assistido.
      </p>
    </header>

    <div class="import-cards">
      <article
        v-for="card in importCards"
        :key="card.kind"
        class="import-card card"
      >
        <h2 class="import-card__title">{{ card.title }}</h2>
        <p class="import-card__description">{{ card.description }}</p>
        <button
          class="btn btn-primary btn-sm"
          :title="card.cta"
          @click="openStructuredImport(card.kind)"
        >
          {{ card.cta }}
        </button>
      </article>
    </div>

    <p v-if="manualImportSummary" class="import-summary" role="status">
      {{ manualImportSummary }}
    </p>

    <section class="legacy-section card" aria-label="Importação por arquivo">
      <header class="legacy-header">
        <div>
          <h2 class="legacy-title">Importação por arquivo (legado)</h2>
          <p class="legacy-subtitle">
            Mantido para compatibilidade com o endpoint `/import` (CSV, YAML, XML, JSON e MD).
          </p>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          :title="legacyCollapsed ? 'Expandir importação por arquivo' : 'Recolher importação por arquivo'"
          @click="legacyCollapsed = !legacyCollapsed"
        >
          {{ legacyCollapsed ? "Expandir" : "Recolher" }}
        </button>
      </header>

      <form
        v-if="!legacyCollapsed"
        class="legacy-form"
        novalidate
        @submit.prevent="submitLegacyFile"
      >
        <label class="legacy-label">
          <span>Selecionar arquivo</span>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,.yml,.yaml,.xml,.json,.md,.markdown"
            @change="onFileChange"
          />
        </label>

        <p v-if="file" class="legacy-file">
          {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
        </p>

        <div class="legacy-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!file || uploading"
          >
            {{ uploading ? "Importando..." : "Importar arquivo" }}
          </button>
        </div>

        <p
          v-if="resultMsg"
          class="legacy-result"
          :class="
            resultMsg.includes('Falha') || resultMsg.includes('Erro')
              ? 'legacy-result--error'
              : 'legacy-result--ok'
          "
        >
          {{ resultMsg }}
        </p>
      </form>
    </section>
  </section>
</template>

<style scoped lang="scss">
@use "../styles/pages/import.module";
</style>
