<script setup lang="ts">
import { defineAsyncComponent, ref, computed } from "vue";
import { useDashboardProjectsPage } from "../assets/scripts/pages/useDashboardProjectsPage";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { FilterState } from "../components/ui/AdvancedFilter.vue";
import {
  PROJECTS_EMPTY_DATE_LABEL,
  PROJECTS_EMPTY_VALUE_LABEL,
  PROJECT_FILTER_DEFAULTS,
  PROJECT_STATUS_LABEL_BY_ID,
  PROJECT_STATUS_OPTIONS,
} from "../utils/constants/dashboard-projects.constants";
import {
  DASHBOARD_PROJECTS_EXPORT_CENTERED_COLUMNS,
  DASHBOARD_PROJECTS_EXPORT_COLUMNS,
  DASHBOARD_PROJECTS_EXPORT_COLUMN_KEYS,
  DASHBOARD_PROJECTS_EXPORT_COLUMN_WIDTHS,
  DashboardProjectsCsvBlueprint,
  SpreadsheetExporter,
  type DashboardProjectsExportColumnKey,
  type DashboardProjectsExportRow,
  type SpreadsheetExportFormat,
} from "../utils/export";

const ProjectFormModal = defineAsyncComponent(
  () => import("../components/forms/ProjectFormModal.vue"),
);

const AdvancedFilter = defineAsyncComponent(
  () => import("../components/ui/AdvancedFilter.vue"),
);

const CommentsPanel = defineAsyncComponent(
  () => import("../components/ui/CommentsPanel.vue"),
);

const NotesPanel = defineAsyncComponent(
  () => import("../components/ui/NotesPanel.vue"),
);

const AttachmentsPanel = defineAsyncComponent(
  () => import("../components/ui/AttachmentsPanel.vue"),
);

const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);

const { rows, loading, error, nextCursor, q, load, more } =
  useDashboardProjectsPage();

const createDefaultProjectFilter = (): FilterState => ({
  ...PROJECT_FILTER_DEFAULTS,
});

const filter = ref<FilterState>(createDefaultProjectFilter());
const selectedProjectId = ref<string | null>(null);
const isDetailOpen = ref(false);

const safeRows = computed(() => (rows.value || []).filter(Boolean) as ProjectRow[]);

const rowById = computed(() => {
  const result = new Map<string, ProjectRow>();
  for (const project of safeRows.value) {
    result.set(project.id, project);
  }
  return result;
});

const selectedProject = computed(() => {
  const projectId = selectedProjectId.value;
  if (!projectId) return null;
  return rowById.value.get(projectId) ?? null;
});

const detailVisible = computed(
  () => isDetailOpen.value && selectedProject.value !== null,
);

const normalizedFilter = computed<FilterState>(() => {
  const current = filter.value;
  return {
    ...createDefaultProjectFilter(),
    ...current,
    tag: (current.tag || "").trim(),
  };
});

const filteredRows = computed(() => {
  const f = normalizedFilter.value;
  let out = safeRows.value;

  if (f.status) out = out.filter((project) => project.status === f.status);
  if (f.tag) out = out.filter((project) => project.tags?.includes(f.tag));
  if (f.dueAfter) out = out.filter((project) => (project.dueAt || "") >= f.dueAfter);
  if (f.dueBefore)
    out = out.filter((project) => (project.dueAt || "") <= f.dueBefore);

  return out;
});

const onFilter = (state: FilterState) => {
  filter.value = { ...createDefaultProjectFilter(), ...state };
};

const onReset = () => {
  filter.value = createDefaultProjectFilter();
};

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_PROJECTS_EXPORT_COLUMN_KEYS,
] as DashboardProjectsExportColumnKey[];

const projectsExporter = new SpreadsheetExporter<
  DashboardProjectsExportRow,
  DashboardProjectsExportColumnKey,
  DashboardProjectsCsvBlueprint
>({
  fileNamePrefix: "projetos-dashboard",
  sheetName: "Projetos",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) =>
    new DashboardProjectsCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: DASHBOARD_PROJECTS_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: DASHBOARD_PROJECTS_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey !== "status") return null;
    if (record.status === "Bloqueado") {
      return {
        fillColor: "FFFEE2E2",
        fontColor: "FFB91C1C",
        bold: true,
        align: "center",
      };
    }
    if (record.status === "Concluído") {
      return {
        fillColor: "FFECFDF5",
        fontColor: "FF166534",
        bold: true,
        align: "center",
      };
    }
    return null;
  },
});

const mapProjectStatusLabel = (status: string): string =>
  (PROJECT_STATUS_LABEL_BY_ID[status] ?? status) || PROJECTS_EMPTY_VALUE_LABEL;

const toDateLabel = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : PROJECTS_EMPTY_DATE_LABEL;

const projectExportRows = computed<DashboardProjectsExportRow[]>(() =>
  filteredRows.value.map((project) => ({
    codigo: project.code || PROJECTS_EMPTY_VALUE_LABEL,
    nome: project.name || PROJECTS_EMPTY_VALUE_LABEL,
    responsavel: project.ownerEmail || PROJECTS_EMPTY_VALUE_LABEL,
    status: mapProjectStatusLabel(project.status),
    tags: project.tags?.length
      ? project.tags.join(", ")
      : PROJECTS_EMPTY_VALUE_LABEL,
    prazo: toDateLabel(project.deadlineAt),
    entrega: toDateLabel(project.dueAt),
  })),
);

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Projetos",
        size: "md",
        data: {
          totalRows: filteredRows.value.length,
          entityLabel: "projeto(s)",
          columnOptions: DASHBOARD_PROJECTS_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  try {
    const selection = await openExportDialog();
    if (!selection) return;

    const records = projectExportRows.value;
    if (!records.length) {
      await AlertService.error(
        "Exportação",
        "Não há projetos para exportar com os filtros selecionados.",
      );
      return;
    }

    const exportedFormats = await projectsExporter.export(records, {
      formats: selection.formats,
      columnKeys: selection.columnKeys as DashboardProjectsExportColumnKey[],
    });

    await AlertService.success(
      "Exportação concluída",
      `${exportedFormats.map((format) => format.toUpperCase()).join(" e ")} gerado(s) com sucesso.`,
    );
  } catch (caughtError) {
    console.error("[DashboardProjectsPage] Export failed:", caughtError);
    await AlertService.error("Erro ao exportar", caughtError);
  }
};

const openCreateProject = async () => {
  const result = await ModalService.open(ProjectFormModal, {
    title: "Criar Novo Projeto",
    size: "md",
  });
  if (result) await load(true);
};

const openEditProject = async (project: ProjectRow) => {
  const result = await ModalService.open(ProjectFormModal, {
    title: `Editar Projeto: ${project.name}`,
    size: "md",
    data: { project },
  });
  if (result) await load(true);
};

const deleteProject = async (project: ProjectRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Projeto",
    `Tem certeza que deseja excluir "${project.name}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.projects.remove(project.id);
    await AlertService.success("Excluído", `"${project.name}" foi excluído.`);

    if (selectedProjectId.value === project.id) {
      selectedProjectId.value = null;
      isDetailOpen.value = false;
    }

    await load(true);
  } catch (caughtError) {
    console.error("[DashboardProjectsPage] Delete failed:", caughtError);
    await AlertService.error("Erro", "Falha ao excluir projeto.");
  }
};

const selectProject = (project: ProjectRow): void => {
  selectedProjectId.value = project.id;
  isDetailOpen.value = true;
};

const closeProjectDetail = (): void => {
  isDetailOpen.value = false;
};

const getProjectRowKey = (project: ProjectRow, index: number): string =>
  project.id || `project-row-${index}`;

const projectStatusOptions = PROJECT_STATUS_OPTIONS.map((option) => ({
  ...option,
}));
</script>

<template>
  <section class="dp-page" aria-label="Projetos">
    <header class="dp-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Projetos</h1>
        <p class="opacity-70">Gerencie seus projetos.</p>
      </div>

      <div class="flex gap-2 items-center flex-wrap">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Buscar projetos"
          placeholder="buscar"
          @keyup.enter="load(true)"
        />
        <AdvancedFilter
          :status-options="projectStatusOptions"
          @filter="onFilter"
          @reset="onReset"
        />
        <button
          class="btn btn-ghost"
          type="button"
          title="Exportar projetos da visão atual"
          @click="handleOpenExportModal"
        >
          Exportar...
        </button>
        <button class="btn btn-primary" type="button" @click="openCreateProject">
          + Novo
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading"
          :aria-disabled="loading"
          @click="load(true)"
        >
          Recarregar
        </button>
      </div>
    </header>

    <div class="dp-layout mt-3">
      <div
        class="dp-card card p-2 overflow-auto flex-1"
        role="region"
        aria-label="Tabela de projetos"
      >
        <table class="min-w-[1100px] w-full" role="table" aria-label="Projetos">
          <thead>
            <tr class="text-left opacity-80">
              <th class="py-2 pr-3">Código</th>
              <th class="py-2 pr-3">Nome</th>
              <th class="py-2 pr-3">Responsável</th>
              <th class="py-2 pr-3">Status</th>
              <th class="py-2 pr-3">Tags</th>
              <th class="py-2 pr-3">Prazo</th>
              <th class="py-2 pr-3">Entrega</th>
              <th class="py-2 pr-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(p, projectIndex) in filteredRows"
              :key="getProjectRowKey(p, projectIndex)"
              class="border-t border-white/10 cursor-pointer"
              :class="{ 'bg-white/5': selectedProject?.id === p.id }"
              @click="selectProject(p)"
            >
              <td class="py-2 pr-3 font-semibold">
                {{ p.code || PROJECTS_EMPTY_VALUE_LABEL }}
              </td>
              <td class="py-2 pr-3">{{ p.name || PROJECTS_EMPTY_VALUE_LABEL }}</td>
              <td class="py-2 pr-3">
                {{ p.ownerEmail || PROJECTS_EMPTY_VALUE_LABEL }}
              </td>
              <td class="py-2 pr-3">{{ mapProjectStatusLabel(p.status) }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-0.5 flex-wrap">
                  <span
                    v-for="tag in p.tags.slice(0, 3)"
                    :key="tag"
                    class="text-xs bg-emerald-500/15 px-1 rounded"
                  >
                    {{ tag }}
                  </span>
                </div>
              </td>
              <td class="py-2 pr-3">{{ toDateLabel(p.deadlineAt) }}</td>
              <td class="py-2 pr-3">{{ toDateLabel(p.dueAt) }}</td>
              <td class="py-2 pr-3">
                <div class="flex gap-1">
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    aria-label="Editar projeto"
                    @click.stop="openEditProject(p)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-ghost btn-sm text-danger"
                    type="button"
                    aria-label="Excluir projeto"
                    @click.stop="deleteProject(p)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredRows.length && !loading">
              <td colspan="8" class="py-6 opacity-70 text-center">
                {{ error || "Nenhum projeto." }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside
        v-show="detailVisible"
        class="dp-detail card p-3 overflow-y-auto"
        aria-label="Detalhes do projeto"
      >
        <template v-if="selectedProject">
          <div class="flex justify-between items-start mb-2">
            <h2 class="font-bold text-sm">{{ selectedProject.name }}</h2>
            <button class="text-xs opacity-40 hover:opacity-100" @click="closeProjectDetail">
              ✕
            </button>
          </div>

          <div class="text-xs opacity-60 mb-3">
            Status: {{ mapProjectStatusLabel(selectedProject.status) }}
            <span v-if="selectedProject.ownerEmail">
              · {{ selectedProject.ownerEmail }}
            </span>
          </div>

          <Suspense>
            <template #default>
              <CommentsPanel
                :target-type="'project'"
                :target-id="selectedProject.id"
              />
            </template>
            <template #fallback>
              <div class="dp-async-fallback" role="status" aria-live="polite">
                <span class="dp-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando comentários…</span>
              </div>
            </template>
          </Suspense>

          <Suspense>
            <template #default>
              <NotesPanel
                :target-type="'project'"
                :target-id="selectedProject.id"
              />
            </template>
            <template #fallback>
              <div class="dp-async-fallback" role="status" aria-live="polite">
                <span class="dp-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando notas…</span>
              </div>
            </template>
          </Suspense>

          <Suspense>
            <template #default>
              <AttachmentsPanel
                :target-type="'project'"
                :target-id="selectedProject.id"
              />
            </template>
            <template #fallback>
              <div class="dp-async-fallback" role="status" aria-live="polite">
                <span class="dp-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando anexos…</span>
              </div>
            </template>
          </Suspense>
        </template>
      </aside>
    </div>

    <div class="mt-3 flex justify-end">
      <button
        class="btn btn-ghost"
        type="button"
        aria-label="Carregar mais"
        :disabled="!nextCursor || loading"
        :aria-disabled="!nextCursor || loading"
        @click="more"
      >
        Carregar mais
      </button>
    </div>
  </section>
</template>

<style lang="scss">
@use "../styles/pages/dashboard-projects.module";
</style>
