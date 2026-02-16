<script setup lang="ts">
import { defineAsyncComponent, ref, computed } from "vue";
import { useDashboardProjectsPage } from "../assets/scripts/pages/useDashboardProjectsPage";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import type { ProjectRow, ProjectStatus } from "../pinia/types/projects.types";
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
const GenericImportModal = defineAsyncComponent(
  () => import("../components/import/GenericImportModal.vue"),
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

/* ── Sorting ─────────────────────────────────────────── */

type SortKey =
  | "code"
  | "name"
  | "ownerEmail"
  | "status"
  | "deadlineAt"
  | "dueAt";

const sortBy = ref<SortKey>("code");
const sortDir = ref<"asc" | "desc">("asc");

const toggleSort = (key: SortKey): void => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortDir.value = "asc";
  }
};

const sortIcon = (key: SortKey): string => {
  if (sortBy.value !== key) return "⇅";
  return sortDir.value === "asc" ? "↑" : "↓";
};

/* ── Bulk selection ──────────────────────────────────── */

const selectedIds = ref<Set<string>>(new Set());

const isAllSelected = computed(() => {
  const rows = sortedFilteredRows.value;
  return rows.length > 0 && rows.every((r) => selectedIds.value.has(r.id));
});

const toggleSelectAll = (): void => {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(sortedFilteredRows.value.map((r) => r.id));
  }
};

const toggleSelectRow = (id: string): void => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
};

const selectedCount = computed(() => selectedIds.value.size);

/* ── Inline status toggle ────────────────────────────── */

const statusDropdownId = ref<string | null>(null);

const STATUS_CYCLE: readonly ProjectStatus[] = [
  "planned",
  "active",
  "blocked",
  "done",
  "archived",
] as const;

const toggleStatusDropdown = (projectId: string, event: Event): void => {
  event.stopPropagation();
  statusDropdownId.value =
    statusDropdownId.value === projectId ? null : projectId;
};

const closeStatusDropdown = (): void => {
  statusDropdownId.value = null;
};

const changeProjectStatus = async (
  project: ProjectRow,
  newStatus: ProjectStatus,
): Promise<void> => {
  closeStatusDropdown();
  if (project.status === newStatus) return;

  try {
    await ApiClientService.projects.update(project.id, { status: newStatus });
    await load(true);
    await AlertService.success(
      "Status atualizado",
      `"${project.name}" agora está como ${PROJECT_STATUS_LABEL_BY_ID[newStatus] ?? newStatus}.`,
    );
  } catch (err) {
    console.error("[DashboardProjectsPage] Status change failed:", err);
    await AlertService.error("Erro", "Falha ao atualizar status.");
  }
};

/* ── Bulk actions ────────────────────────────────────── */

const bulkDeleteProjects = async (): Promise<void> => {
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;

  const confirmed = await AlertService.confirm(
    "Excluir em massa",
    `Tem certeza que deseja excluir ${ids.length} projeto(s)? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    try {
      await ApiClientService.projects.remove(id);
      successCount++;
    } catch {
      failCount++;
    }
  }

  selectedIds.value = new Set();
  if (selectedProjectId.value && ids.includes(selectedProjectId.value)) {
    selectedProjectId.value = null;
    isDetailOpen.value = false;
  }

  await load(true);

  if (failCount === 0) {
    await AlertService.success(
      "Exclusão concluída",
      `${successCount} projeto(s) excluído(s) com sucesso.`,
    );
  } else {
    await AlertService.error(
      "Exclusão parcial",
      `${successCount} excluído(s), ${failCount} falha(s).`,
    );
  }
};

const bulkChangeStatus = async (newStatus: ProjectStatus): Promise<void> => {
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;

  const statusLabel = PROJECT_STATUS_LABEL_BY_ID[newStatus] ?? newStatus;
  const confirmed = await AlertService.confirm(
    "Alterar status em massa",
    `Alterar status de ${ids.length} projeto(s) para "${statusLabel}"?`,
  );
  if (!confirmed) return;

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    try {
      await ApiClientService.projects.update(id, { status: newStatus });
      successCount++;
    } catch {
      failCount++;
    }
  }

  selectedIds.value = new Set();
  await load(true);

  if (failCount === 0) {
    await AlertService.success(
      "Status atualizado",
      `${successCount} projeto(s) atualizado(s) para "${statusLabel}".`,
    );
  } else {
    await AlertService.error(
      "Atualização parcial",
      `${successCount} atualizado(s), ${failCount} falha(s).`,
    );
  }
};

const safeRows = computed(
  () => (rows.value || []).filter(Boolean) as ProjectRow[],
);

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
  if (f.dueAfter)
    out = out.filter((project) => (project.dueAt || "") >= f.dueAfter);
  if (f.dueBefore)
    out = out.filter((project) => (project.dueAt || "") <= f.dueBefore);

  return out;
});

const sortedFilteredRows = computed(() => {
  const items = [...filteredRows.value];
  const key = sortBy.value;
  const dir = sortDir.value === "asc" ? 1 : -1;

  items.sort((a, b) => {
    const av = (a[key] ?? "") as string;
    const bv = (b[key] ?? "") as string;
    return av.localeCompare(bv, "pt-BR", { sensitivity: "base" }) * dir;
  });

  return items;
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
const exportFlow = new TableExportFlowOrchestrator("DashboardProjectsPage");

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
          presetKey: "dashboard.projects",
          totalRows: filteredRows.value.length,
          entityLabel: "projeto(s)",
          columnOptions: DASHBOARD_PROJECTS_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  await exportFlow.execute({
    openDialog: openExportDialog,
    emptyStateMessage:
      "Não há projetos para exportar com os filtros selecionados.",
    buildRecords: () => projectExportRows.value,
    exportRecords: async (records, selection) =>
      projectsExporter.export(records, {
        formats: selection.formats,
        columnKeys: selection.columnKeys as DashboardProjectsExportColumnKey[],
      }),
  });
};

const openCreateProject = async () => {
  const result = await ModalService.open(ProjectFormModal, {
    title: "Criar Novo Projeto",
    size: "md",
  });
  if (result) await load(true);
};

const openMassImportModal = async () => {
  const ProjectMassImportService = (
    await import("../services/ProjectMassImportService")
  ).default;
  const result = await ModalService.open<{
    shouldRefresh: boolean;
    draft?: Record<string, unknown>;
  }>(GenericImportModal, {
    title: "Importar Projetos em Massa",
    size: "lg",
    data: {
      mode: "mass",
      service: new ProjectMassImportService(),
      entityLabel: "Projetos",
      displayField: "name",
      singleParseMethod: "parseForSingleProject",
    },
  });

  if (result?.shouldRefresh) {
    await load(true);
  }
};

const openSingleImportModal = async () => {
  const ProjectMassImportService = (
    await import("../services/ProjectMassImportService")
  ).default;
  const result = await ModalService.open<{
    shouldRefresh: boolean;
    draft?: Record<string, unknown>;
  }>(GenericImportModal, {
    title: "Importar Projeto de Arquivo",
    size: "md",
    data: {
      mode: "single",
      service: new ProjectMassImportService(),
      entityLabel: "Projetos",
      displayField: "name",
      singleParseMethod: "parseForSingleProject",
    },
  });

  if (result?.draft) {
    const created = await ModalService.open(ProjectFormModal, {
      title: "Novo Projeto (Importado)",
      size: "md",
      data: { draft: result.draft },
    });
    if (created) await load(true);
  }
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

  const Swal = (await import("sweetalert2")).default;
  Swal.fire({
    title: "Excluindo...",
    html: `Removendo "<strong>${project.name}</strong>"...`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await ApiClientService.projects.remove(project.id);

    if (selectedProjectId.value === project.id) {
      selectedProjectId.value = null;
      isDetailOpen.value = false;
    }
    selectedIds.value.delete(project.id);

    await load(true);
    Swal.close();
    await AlertService.success("Excluído", `"${project.name}" foi excluído.`);
  } catch (caughtError) {
    console.error("[DashboardProjectsPage] Delete failed:", caughtError);
    Swal.close();
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
          <i class="bi bi-download" aria-hidden="true"></i>
          Exportar...
        </button>
        <div
          class="btn-group"
          role="group"
          aria-label="Opções de importação de projetos"
        >
          <button
            class="btn btn-sm btn-ghost"
            title="Importar projetos em massa de arquivo CSV, JSON ou XML"
            data-testid="dashboard-projects-mass-import-btn"
            data-cy="mass-import-projects-button"
            @click="openMassImportModal"
          >
            <i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
            Importar em Massa
          </button>
          <button
            class="btn btn-sm btn-ghost"
            title="Carregar dados de projeto de arquivo para formulário"
            data-testid="dashboard-projects-single-import-btn"
            data-cy="single-import-project-button"
            @click="openSingleImportModal"
          >
            <i class="bi bi-upload" aria-hidden="true"></i>
            Importar para Formulário
          </button>
        </div>
        <button
          class="btn btn-primary"
          type="button"
          @click="openCreateProject"
        >
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
        @click="closeStatusDropdown"
      >
        <!-- Bulk action bar -->
        <div
          v-if="selectedCount > 0"
          class="dp-bulk-bar"
          data-testid="dp-bulk-bar"
        >
          <span class="dp-bulk-bar__count">{{ selectedCount }}</span>
          <span>selecionado(s)</span>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            data-testid="dp-bulk-status"
            @click.stop="bulkChangeStatus('active')"
          >
            → Ativo
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            @click.stop="bulkChangeStatus('done')"
          >
            → Concluído
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            @click.stop="bulkChangeStatus('archived')"
          >
            → Arquivado
          </button>
          <button
            class="btn btn-ghost btn-sm text-danger"
            type="button"
            data-testid="dp-bulk-delete"
            @click.stop="bulkDeleteProjects"
          >
            Excluir selecionados
          </button>
        </div>

        <table class="min-w-275 w-full" role="table" aria-label="Projetos">
          <thead>
            <tr class="text-left opacity-80">
              <th class="py-2 pr-1" style="width: 2rem">
                <input
                  type="checkbox"
                  class="dp-checkbox"
                  data-testid="dp-select-all"
                  :checked="isAllSelected"
                  :indeterminate="selectedCount > 0 && !isAllSelected"
                  aria-label="Selecionar todos"
                  @change="toggleSelectAll"
                />
              </th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="code"
                @click="toggleSort('code')"
              >
                Código
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'code' }"
                  >{{ sortIcon("code") }}</span
                >
              </th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="name"
                @click="toggleSort('name')"
              >
                Nome
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'name' }"
                  >{{ sortIcon("name") }}</span
                >
              </th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="ownerEmail"
                @click="toggleSort('ownerEmail')"
              >
                Responsável
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'ownerEmail' }"
                  >{{ sortIcon("ownerEmail") }}</span
                >
              </th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="status"
                @click="toggleSort('status')"
              >
                Status
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'status' }"
                  >{{ sortIcon("status") }}</span
                >
              </th>
              <th class="py-2 pr-3">Tags</th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="deadlineAt"
                @click="toggleSort('deadlineAt')"
              >
                Prazo
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'deadlineAt' }"
                  >{{ sortIcon("deadlineAt") }}</span
                >
              </th>
              <th
                class="py-2 pr-3 dp-th-sortable"
                data-sort-key="dueAt"
                @click="toggleSort('dueAt')"
              >
                Entrega
                <span
                  class="dp-sort-icon"
                  :class="{ 'dp-sort-icon--active': sortBy === 'dueAt' }"
                  >{{ sortIcon("dueAt") }}</span
                >
              </th>
              <th class="py-2 pr-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            <!-- Loading skeleton -->
            <template v-if="loading && !sortedFilteredRows.length">
              <tr
                v-for="skIdx in 5"
                :key="`skeleton-${skIdx}`"
                class="dp-skeleton-row border-t border-white/10"
              >
                <td class="dp-skeleton-cell" style="width: 2rem">
                  <div class="dp-skeleton-bar" style="width: 1rem"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 60%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 80%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 70%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 50%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 40%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 55%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 55%"></div>
                </td>
                <td class="dp-skeleton-cell">
                  <div class="dp-skeleton-bar" style="width: 45%"></div>
                </td>
              </tr>
            </template>

            <tr
              v-for="(p, projectIndex) in sortedFilteredRows"
              :key="getProjectRowKey(p, projectIndex)"
              class="border-t border-white/10 cursor-pointer"
              :class="{
                'bg-white/5': selectedProject?.id === p.id,
                'bg-primary/5': selectedIds.has(p.id),
              }"
              @click="selectProject(p)"
            >
              <td class="py-2 pr-1" @click.stop>
                <input
                  type="checkbox"
                  class="dp-checkbox"
                  :checked="selectedIds.has(p.id)"
                  :aria-label="`Selecionar ${p.name}`"
                  @change="toggleSelectRow(p.id)"
                />
              </td>
              <td class="py-2 pr-3 font-semibold">
                {{ p.code || PROJECTS_EMPTY_VALUE_LABEL }}
              </td>
              <td class="py-2 pr-3">
                {{ p.name || PROJECTS_EMPTY_VALUE_LABEL }}
              </td>
              <td class="py-2 pr-3">
                {{ p.ownerEmail || PROJECTS_EMPTY_VALUE_LABEL }}
              </td>
              <td class="py-2 pr-3 dp-status-cell" @click.stop>
                <span
                  class="dp-status-badge"
                  :class="`dp-status-badge--${p.status}`"
                  role="button"
                  tabindex="0"
                  :title="`Alterar status de ${p.name}`"
                  data-testid="dp-status-badge"
                  @click="toggleStatusDropdown(p.id, $event)"
                  @keydown.enter="toggleStatusDropdown(p.id, $event)"
                  @keydown.space.prevent="toggleStatusDropdown(p.id, $event)"
                >
                  {{ mapProjectStatusLabel(p.status) }}
                </span>
                <ul
                  v-if="statusDropdownId === p.id"
                  class="dp-status-dropdown"
                  role="listbox"
                  data-testid="dp-status-dropdown"
                >
                  <li
                    v-for="opt in STATUS_CYCLE"
                    :key="opt"
                    class="dp-status-dropdown__item"
                    :class="{
                      'dp-status-dropdown__item--current': p.status === opt,
                    }"
                    role="option"
                    :aria-selected="p.status === opt"
                    @click="changeProjectStatus(p, opt)"
                  >
                    <span
                      class="dp-status-badge"
                      :class="`dp-status-badge--${opt}`"
                      style="pointer-events: none"
                    >
                      {{ mapProjectStatusLabel(opt) }}
                    </span>
                  </li>
                </ul>
              </td>
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

            <tr v-if="!sortedFilteredRows.length && !loading">
              <td colspan="9" class="py-6 opacity-70 text-center">
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
            <button
              class="text-xs opacity-40 hover:opacity-100"
              @click="closeProjectDetail"
            >
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
                <span
                  class="dp-async-fallback__spinner"
                  aria-hidden="true"
                ></span>
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
                <span
                  class="dp-async-fallback__spinner"
                  aria-hidden="true"
                ></span>
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
                <span
                  class="dp-async-fallback__spinner"
                  aria-hidden="true"
                ></span>
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
