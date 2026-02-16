<script setup lang="ts">
import { defineAsyncComponent, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDashboardTasksPage } from "../assets/scripts/pages/useDashboardTasksPage";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import StorageService from "../services/StorageService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import type { TaskRow } from "../pinia/types/tasks.types";
import type { FilterState } from "../components/ui/AdvancedFilter.vue";
import {
  TASKS_DEFAULT_VIEW_MODE,
  TASKS_EMPTY_DATE_LABEL,
  TASKS_EMPTY_VALUE_LABEL,
  TASKS_VIEW_MODE_STORAGE_KEY,
  TASK_FILTER_DEFAULTS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABEL_BY_ID,
  TASK_STATUS_OPTIONS,
  type TaskViewMode,
} from "../utils/constants/dashboard-tasks.constants";
import {
  DASHBOARD_TASKS_EXPORT_CENTERED_COLUMNS,
  DASHBOARD_TASKS_EXPORT_COLUMNS,
  DASHBOARD_TASKS_EXPORT_COLUMN_KEYS,
  DASHBOARD_TASKS_EXPORT_COLUMN_WIDTHS,
  DashboardTasksCsvBlueprint,
  SpreadsheetExporter,
  type DashboardTasksExportColumnKey,
  type DashboardTasksExportRow,
  type SpreadsheetExportFormat,
} from "../utils/export";

const TaskFormModal = defineAsyncComponent(
  () => import("../components/forms/TaskFormModal.vue"),
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

const TaskDetailPanel = defineAsyncComponent(
  () => import("../components/tasks/TaskDetailPanel.vue"),
);

const KanbanBoard = defineAsyncComponent(
  () => import("../components/tasks/KanbanBoard.vue"),
);

const route = useRoute();
const router = useRouter();

const { rows, q, loading, error, nextCursor, load, more } =
  useDashboardTasksPage();

/* ── View mode toggle (table / kanban) ──────────────── */

const viewMode = ref<TaskViewMode>(
  (StorageService.local.getStr(
    TASKS_VIEW_MODE_STORAGE_KEY,
    TASKS_DEFAULT_VIEW_MODE,
  ) as TaskViewMode) || TASKS_DEFAULT_VIEW_MODE,
);

watch(viewMode, (v) =>
  StorageService.local.setStr(TASKS_VIEW_MODE_STORAGE_KEY, v),
);

/* ── Query param taskId → detail panel ──────────────── */

const hasTaskDetail = computed(
  () => !!route.query.taskId && typeof route.query.taskId === "string",
);

/* ── Filtering ──────────────────────────────────────── */

const createDefaultTaskFilter = (): FilterState => ({
  ...TASK_FILTER_DEFAULTS,
});

const filter = ref<FilterState>(createDefaultTaskFilter());

const selectedTask = ref<TaskRow | null>(null);

const safeRows = computed(
  () => (rows.value || []).filter(Boolean) as TaskRow[],
);

const normalizedFilter = computed<FilterState>(() => {
  const current = filter.value;
  return {
    ...createDefaultTaskFilter(),
    ...current,
    assignee: (current.assignee || "").trim(),
    tag: (current.tag || "").trim(),
  };
});

const filteredRows = computed(() => {
  let out = safeRows.value;
  const f = normalizedFilter.value;
  if (f.status) out = out.filter((t) => t.status === f.status);
  if (f.priority) out = out.filter((t) => String(t.priority) === f.priority);
  if (f.assignee)
    out = out.filter((t) =>
      (t.assigneeEmail || "").toLowerCase().includes(f.assignee.toLowerCase()),
    );
  if (f.tag) out = out.filter((t) => t.tags?.includes(f.tag));
  if (f.dueAfter) out = out.filter((t) => (t.dueAt || "") >= f.dueAfter);
  if (f.dueBefore) out = out.filter((t) => (t.dueAt || "") <= f.dueBefore);
  return out;
});

const onFilter = (s: FilterState) => {
  filter.value = { ...createDefaultTaskFilter(), ...s };
};

const onReset = () => {
  filter.value = createDefaultTaskFilter();
};

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_TASKS_EXPORT_COLUMN_KEYS,
] as DashboardTasksExportColumnKey[];

const tasksExporter = new SpreadsheetExporter<
  DashboardTasksExportRow,
  DashboardTasksExportColumnKey,
  DashboardTasksCsvBlueprint
>({
  fileNamePrefix: "tarefas-dashboard",
  sheetName: "Tarefas",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) =>
    new DashboardTasksCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: DASHBOARD_TASKS_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: DASHBOARD_TASKS_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey === "status" && record.status === "Bloqueado") {
      return {
        fillColor: "FFFEE2E2",
        fontColor: "FFB91C1C",
        bold: true,
        align: "center",
      };
    }
    if (
      columnKey === "prioridade" &&
      ["P1", "P2"].includes(record.prioridade)
    ) {
      return {
        fillColor: "FFFFF7ED",
        fontColor: "FF9A3412",
        bold: true,
        align: "center",
      };
    }
    return null;
  },
});
const exportFlow = new TableExportFlowOrchestrator("DashboardTasksPage");

const mapTaskStatusLabel = (status: string): string => {
  return (TASK_STATUS_LABEL_BY_ID[status] ?? status) || TASKS_EMPTY_VALUE_LABEL;
};

const toTaskPriorityLabel = (priority: number): string => `P${priority || 0}`;
const toDateLabel = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : TASKS_EMPTY_DATE_LABEL;

const taskExportRows = computed<DashboardTasksExportRow[]>(() =>
  filteredRows.value.map((task) => ({
    titulo: task.title || TASKS_EMPTY_VALUE_LABEL,
    projeto: task.projectId || TASKS_EMPTY_VALUE_LABEL,
    responsavel: task.assigneeEmail || TASKS_EMPTY_VALUE_LABEL,
    status: mapTaskStatusLabel(task.status),
    prioridade: toTaskPriorityLabel(task.priority),
    tags: task.tags?.length ? task.tags.join(", ") : TASKS_EMPTY_VALUE_LABEL,
    entrega: toDateLabel(task.dueAt),
  })),
);

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Tarefas",
        size: "md",
        data: {
          presetKey: "dashboard.tasks",
          totalRows: filteredRows.value.length,
          entityLabel: "tarefa(s)",
          columnOptions: DASHBOARD_TASKS_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  await exportFlow.execute({
    openDialog: openExportDialog,
    emptyStateMessage:
      "Não há tarefas para exportar com os filtros selecionados.",
    buildRecords: () => taskExportRows.value,
    exportRecords: async (records, selection) =>
      tasksExporter.export(records, {
        formats: selection.formats,
        columnKeys: selection.columnKeys as DashboardTasksExportColumnKey[],
      }),
  });
};

/* ── Import actions ───────────────────────────────────── */

const openMassImportModal = async () => {
  const TaskImportService = (await import("../services/TaskImportService"))
    .default;
  const result = await ModalService.open<{
    shouldRefresh: boolean;
    draft?: Record<string, unknown>;
  }>(GenericImportModal, {
    title: "Importar Tarefas em Massa",
    size: "lg",
    data: {
      mode: "mass",
      service: new TaskImportService(),
      entityLabel: "Tarefas",
      displayField: "title",
      singleParseMethod: "parseForSingleTask",
    },
  });

  if (result?.shouldRefresh) {
    await load(true);
  }
};

const openSingleImportModal = async () => {
  const TaskImportService = (await import("../services/TaskImportService"))
    .default;
  const result = await ModalService.open<{
    shouldRefresh: boolean;
    draft?: Record<string, unknown>;
  }>(GenericImportModal, {
    title: "Importar Tarefa de Arquivo",
    size: "md",
    data: {
      mode: "single",
      service: new TaskImportService(),
      entityLabel: "Tarefas",
      displayField: "title",
      singleParseMethod: "parseForSingleTask",
    },
  });

  if (result?.draft) {
    // Open task form modal with prefilled data
    await ModalService.open(TaskFormModal, {
      title: "Nova Tarefa (Importada)",
      size: "md",
      data: { draft: result.draft },
    });
  }
};

/* ── CRUD actions ───────────────────────────────────── */

const openCreateTask = async () => {
  const result = await ModalService.open(TaskFormModal, {
    title: "Criar Nova Tarefa",
    size: "md",
  });
  if (result) await load(true);
};

const openEditTask = async (task: TaskRow) => {
  const result = await ModalService.open(TaskFormModal, {
    title: `Editar Tarefa: ${task.title}`,
    size: "md",
    data: { task },
  });
  if (result) await load(true);
};

const deleteTask = async (task: TaskRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Tarefa",
    `Tem certeza que deseja excluir "${task.title}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.tasks.remove(task.id);
    await AlertService.success("Excluída", `"${task.title}" foi excluída.`);
    selectedTask.value = null;
    await load(true);
  } catch (e) {
    console.error("[DashboardTasksPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir tarefa.");
  }
};

/* ── Select helpers ─────────────────────────────────── */

const selectAndOpenDetail = (task: TaskRow) => {
  selectedTask.value = task;
  router.push({
    path: route.path,
    query: { ...route.query, taskId: task.id },
  });
};

const getTaskRowKey = (task: TaskRow, index: number): string =>
  task.id || `task-row-${index}`;

const taskStatusOptions = TASK_STATUS_OPTIONS.map((option) => ({ ...option }));
const taskPriorityOptions = TASK_PRIORITY_OPTIONS.map((option) => ({
  ...option,
}));
</script>

<template>
  <section class="dt-page" aria-label="Tarefas">
    <header class="dt-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Tarefas</h1>
        <p class="opacity-70">Gerencie tarefas em todos os projetos.</p>
      </div>

      <div class="flex gap-2 items-center flex-wrap">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Buscar tarefas"
          placeholder="buscar"
          @keyup.enter="load(true)"
        />
        <AdvancedFilter
          :status-options="taskStatusOptions"
          :priority-options="taskPriorityOptions"
          show-assignee
          @filter="onFilter"
          @reset="onReset"
        />

        <!-- View toggle -->
        <div class="dt-view-toggle" role="group" aria-label="Modo de exibição">
          <button
            class="dt-view-btn"
            :class="{ active: viewMode === 'table' }"
            type="button"
            aria-label="Visualização em tabela"
            @click="viewMode = 'table'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="16"
              height="16"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            class="dt-view-btn"
            :class="{ active: viewMode === 'kanban' }"
            type="button"
            aria-label="Visualização em kanban"
            @click="viewMode = 'kanban'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="16"
              height="16"
            >
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
            </svg>
          </button>
        </div>

        <!-- Import Buttons -->
        <div class="btn-group" role="group" aria-label="Opções de importação">
          <button
            class="btn btn-sm btn-ghost"
            title="Importar tarefas em massa de arquivo CSV, JSON ou XML"
            data-testid="dashboard-tasks-mass-import-btn"
            data-cy="mass-import-tasks-button"
            @click="openMassImportModal"
          >
            <i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
            Importar em Massa
          </button>
          <button
            class="btn btn-sm btn-ghost"
            title="Carregar dados de tarefa de arquivo para formulário"
            data-testid="dashboard-tasks-single-import-btn"
            data-cy="single-import-task-button"
            @click="openSingleImportModal"
          >
            <i class="bi bi-upload" aria-hidden="true"></i>
            Importar para Formulário
          </button>
        </div>

        <button
          class="btn btn-ghost"
          type="button"
          title="Exportar tarefas da visão atual"
          @click="handleOpenExportModal"
        >
          <i class="bi bi-download" aria-hidden="true"></i>
          Exportar...
        </button>
        <button class="btn btn-primary" type="button" @click="openCreateTask">
          + Nova
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

    <div class="dt-layout mt-3">
      <!-- Table view -->
      <div v-show="viewMode === 'table'" class="dt-table-shell">
        <div
          class="dt-card card p-2 overflow-auto flex-1"
          role="region"
          aria-label="Tabela de tarefas"
        >
          <table class="min-w-300 w-full" role="table" aria-label="Tarefas">
            <thead>
              <tr class="text-left opacity-80">
                <th class="py-2 pr-3">Título</th>
                <th class="py-2 pr-3">Projeto</th>
                <th class="py-2 pr-3">Responsável</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 pr-3">Prioridade</th>
                <th class="py-2 pr-3">Tags</th>
                <th class="py-2 pr-3">Entrega</th>
                <th class="py-2 pr-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(t, taskIndex) in filteredRows"
                :key="getTaskRowKey(t, taskIndex)"
                class="border-t border-white/10 cursor-pointer"
                :class="{ 'bg-white/5': selectedTask?.id === t.id }"
                @click="selectAndOpenDetail(t)"
              >
                <td class="py-2 pr-3 font-semibold">
                  {{ t.title || TASKS_EMPTY_VALUE_LABEL }}
                </td>
                <td class="py-2 pr-3">
                  {{ t.projectId || TASKS_EMPTY_VALUE_LABEL }}
                </td>
                <td class="py-2 pr-3">
                  {{ t.assigneeEmail || TASKS_EMPTY_VALUE_LABEL }}
                </td>
                <td class="py-2 pr-3">{{ mapTaskStatusLabel(t.status) }}</td>
                <td class="py-2 pr-3">{{ toTaskPriorityLabel(t.priority) }}</td>
                <td class="py-2 pr-3">
                  <div class="flex gap-0.5 flex-wrap">
                    <span
                      v-for="tag in t.tags.slice(0, 3)"
                      :key="tag"
                      class="text-xs bg-indigo-500/15 px-1 rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </td>
                <td class="py-2 pr-3">{{ toDateLabel(t.dueAt) }}</td>
                <td class="py-2 pr-3">
                  <div class="flex gap-1">
                    <button
                      class="btn btn-ghost btn-sm"
                      type="button"
                      aria-label="Editar tarefa"
                      @click.stop="openEditTask(t)"
                    >
                      Editar
                    </button>
                    <button
                      class="btn btn-ghost btn-sm text-danger"
                      type="button"
                      aria-label="Excluir tarefa"
                      @click.stop="deleteTask(t)"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredRows.length && !loading">
                <td colspan="8" class="py-6 opacity-70 text-center">
                  {{ error || "Nenhuma tarefa." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Classic detail sidebar (comments / notes / attachments) -->
        <aside
          v-if="selectedTask && !hasTaskDetail"
          class="dt-detail card p-3 overflow-y-auto"
          aria-label="Detalhes da tarefa"
        >
          <div class="flex justify-between items-start mb-2">
            <h2 class="font-bold text-sm">{{ selectedTask.title }}</h2>
            <button
              class="text-xs opacity-40 hover:opacity-100"
              @click="selectedTask = null"
            >
              ✕
            </button>
          </div>

          <div class="text-xs opacity-60 mb-3">
            Status: {{ selectedTask.status }} · P{{ selectedTask.priority }}
            <span v-if="selectedTask.assigneeEmail">
              · {{ selectedTask.assigneeEmail }}
            </span>
          </div>

          <CommentsPanel :target-type="'task'" :target-id="selectedTask.id" />
          <NotesPanel :target-type="'task'" :target-id="selectedTask.id" />
          <AttachmentsPanel
            :target-type="'task'"
            :target-id="selectedTask.id"
          />
        </aside>
      </div>

      <!-- Kanban view -->
      <KanbanBoard v-show="viewMode === 'kanban'" />

      <!-- Task detail panel (driven by ?taskId=xxx) -->
      <TaskDetailPanel v-if="hasTaskDetail" />
    </div>

    <div class="mt-3 flex justify-end" v-show="viewMode === 'table'">
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
@use "../styles/pages/dashboard-tasks.module";
</style>
