<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDashboardMyWorkPage } from "../assets/scripts/pages/useDashboardMyWorkPage";
import type { TaskRow } from "../pinia/types/tasks.types";
import ModalService from "../services/ModalService";
import AlertService from "../services/AlertService";
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
import {
  MY_WORK_EMPTY_DUE_LABEL,
  MY_WORK_PRIORITY_BAR_DEFINITIONS,
  MY_WORK_PRIORITY_TABS,
  MY_WORK_PROJECT_PROGRESS_BAR_COLOR,
  MY_WORK_STATUS_TABS,
  MY_WORK_STATUS_TONE_CLASS_BY_ID,
  MY_WORK_TASK_STATUS_BAR_DEFINITIONS,
  MY_WORK_TASK_STATUS_LABEL_BY_ID,
  MY_WORK_WORKFLOW_SLICE_DEFINITIONS,
  type MyWorkPriorityFilter,
  type MyWorkStatusFilter,
  type MyWorkTaskStatusWithoutArchived,
} from "../utils/constants/dashboard-my-work.constants";

const TaskDetailPanel = defineAsyncComponent(
  () => import("../components/tasks/TaskDetailPanel.vue"),
);

const BarChart = defineAsyncComponent(
  () => import("../components/charts/BarChart.vue"),
);

const DonutChart = defineAsyncComponent(
  () => import("../components/charts/DonutChart.vue"),
);

const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);

const {
  loading,
  syncing,
  meEmail,
  myTasks,
  pendingTasks,
  highPriorityTasks,
  upcomingDeadlines,
  myProjects,
  clientStats,
  bestConnectedClients,
  professionalRole,
  refresh,
  getProjectProgress,
  getProjectLabel,
} = useDashboardMyWorkPage();

const router = useRouter();

const statusTabs = MY_WORK_STATUS_TABS;
const priorityTabs = MY_WORK_PRIORITY_TABS;

const statusFilter = ref<MyWorkStatusFilter>("pending");
const priorityFilter = ref<MyWorkPriorityFilter>("all");
const showProjects = ref(true);
const showCharts = ref(true);
const TASK_TABLE_PAGE_SIZE_OPTIONS = [20, 40, 80] as const;
const taskTablePage = ref(1);
const taskTablePageSize = ref<(typeof TASK_TABLE_PAGE_SIZE_OPTIONS)[number]>(20);

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_TASKS_EXPORT_COLUMN_KEYS,
] as DashboardTasksExportColumnKey[];

const myWorkExporter = new SpreadsheetExporter<
  DashboardTasksExportRow,
  DashboardTasksExportColumnKey,
  DashboardTasksCsvBlueprint
>({
  fileNamePrefix: "meu-trabalho-dashboard",
  sheetName: "Meu Trabalho",
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
    if (columnKey === "prioridade" && ["P1", "P2"].includes(record.prioridade)) {
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

const openTask = (task: TaskRow): void => {
  router.push({
    query: { ...router.currentRoute.value.query, taskId: task.id },
  });
};

const statusLabel = (status: string): string => {
  const dictionary = MY_WORK_TASK_STATUS_LABEL_BY_ID as Readonly<
    Record<string, string>
  >;
  return dictionary[status] || status;
};

const priorityLabel = (priority: number): string => `P${priority}`;

const statusToneClass = (status: string): string => {
  const dictionary = MY_WORK_STATUS_TONE_CLASS_BY_ID as Readonly<
    Record<string, string>
  >;
  return dictionary[status] || "mw-status-tone-neutral";
};

const toEpochOrNull = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  const epoch = parsed.getTime();
  return Number.isNaN(epoch) ? null : epoch;
};

const activeTaskRows = computed(() =>
  myTasks.value.filter((task) => task.status !== "archived"),
);

const doneTaskRows = computed(() =>
  activeTaskRows.value.filter((task) => task.status === "done"),
);

const baseFilteredTaskRows = computed(() => {
  if (statusFilter.value === "pending") {
    return activeTaskRows.value.filter((task) => task.status !== "done");
  }
  if (statusFilter.value === "done") {
    return doneTaskRows.value;
  }
  return activeTaskRows.value;
});

const matchesPriorityFilter = (task: TaskRow): boolean => {
  if (priorityFilter.value === "critical") {
    return task.priority <= 2;
  }
  if (priorityFilter.value === "important") {
    return task.priority === 3;
  }
  if (priorityFilter.value === "normal") {
    return task.priority >= 4;
  }
  return true;
};

const filteredTaskRows = computed(() => {
  return baseFilteredTaskRows.value
    .filter(matchesPriorityFilter)
    .map((task) => ({
      task,
      dueEpoch: toEpochOrNull(task.dueAt),
      updatedEpoch: toEpochOrNull(task.updatedAt) ?? 0,
    }))
    .sort((left, right) => {
      if (left.dueEpoch !== null && right.dueEpoch !== null) {
        return left.dueEpoch - right.dueEpoch;
      }
      if (left.dueEpoch !== null) {
        return -1;
      }
      if (right.dueEpoch !== null) {
        return 1;
      }
      return right.updatedEpoch - left.updatedEpoch;
    })
    .map(({ task }) => task);
});

const taskTableTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTaskRows.value.length / taskTablePageSize.value)),
);

const pagedTaskRows = computed(() => {
  const startIndex = (taskTablePage.value - 1) * taskTablePageSize.value;
  return filteredTaskRows.value.slice(
    startIndex,
    startIndex + taskTablePageSize.value,
  );
});

const taskTableFirstVisible = computed(() => {
  if (!filteredTaskRows.value.length) {
    return 0;
  }
  return (taskTablePage.value - 1) * taskTablePageSize.value + 1;
});

const taskTableLastVisible = computed(() => {
  if (!filteredTaskRows.value.length) {
    return 0;
  }
  return Math.min(
    filteredTaskRows.value.length,
    taskTableFirstVisible.value + pagedTaskRows.value.length - 1,
  );
});

const setTaskTablePage = (nextPage: number): void => {
  const clamped = Math.min(Math.max(nextPage, 1), taskTableTotalPages.value);
  taskTablePage.value = clamped;
};

const setTaskTablePageSize = (nextSize: number): void => {
  if (
    !TASK_TABLE_PAGE_SIZE_OPTIONS.includes(
      nextSize as (typeof TASK_TABLE_PAGE_SIZE_OPTIONS)[number],
    )
  ) {
    return;
  }
  taskTablePageSize.value =
    nextSize as (typeof TASK_TABLE_PAGE_SIZE_OPTIONS)[number];
  taskTablePage.value = 1;
};

watch([statusFilter, priorityFilter], () => {
  taskTablePage.value = 1;
});

watch([filteredTaskRows, taskTablePageSize], () => {
  if (taskTablePage.value > taskTableTotalPages.value) {
    taskTablePage.value = taskTableTotalPages.value;
  }
});

const toDateLabel = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : MY_WORK_EMPTY_DUE_LABEL;

const buildMyWorkExportRows = (): DashboardTasksExportRow[] =>
  filteredTaskRows.value.map((task) => ({
    titulo: task.title || "—",
    projeto: getProjectLabel(task.projectId),
    responsavel: task.assigneeEmail || meEmail.value || "—",
    status: statusLabel(task.status),
    prioridade: priorityLabel(task.priority),
    tags: task.tags?.length ? task.tags.join(", ") : "—",
    entrega: toDateLabel(task.dueAt),
  }));

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Meu Trabalho",
        size: "md",
        data: {
          totalRows: filteredTaskRows.value.length,
          entityLabel: "tarefa(s)",
          columnOptions: DASHBOARD_TASKS_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  try {
    const selection = await openExportDialog();
    if (!selection) return;

    const records = buildMyWorkExportRows();
    if (!records.length) {
      await AlertService.error(
        "Exportação",
        "Não há tarefas para exportar com os filtros selecionados.",
      );
      return;
    }

    const exportedFormats = await myWorkExporter.export(records, {
      formats: selection.formats,
      columnKeys: selection.columnKeys as DashboardTasksExportColumnKey[],
    });

    await AlertService.success(
      "Exportação concluída",
      `${exportedFormats.map((format) => format.toUpperCase()).join(" e ")} gerado(s) com sucesso.`,
    );
  } catch (caughtError) {
    console.error("[DashboardMyWorkPage] Export failed:", caughtError);
    await AlertService.error("Erro ao exportar", caughtError);
  }
};

const focusedTaskRows = computed(() => filteredTaskRows.value.slice(0, 5));

const filteredTaskLabel = computed(() => {
  if (statusFilter.value === "pending") {
    return "Pendentes no filtro";
  }
  if (statusFilter.value === "done") {
    return "Concluídas no filtro";
  }
  return "Tarefas no filtro";
});

const emptyStatusCountMap = (): Record<MyWorkTaskStatusWithoutArchived, number> => ({
  todo: 0,
  doing: 0,
  blocked: 0,
  done: 0,
});

const buildStatusCountMap = (
  tasks: readonly TaskRow[],
): Record<MyWorkTaskStatusWithoutArchived, number> => {
  const counters = emptyStatusCountMap();
  for (const task of tasks) {
    if (task.status === "todo") {
      counters.todo += 1;
    } else if (task.status === "doing") {
      counters.doing += 1;
    } else if (task.status === "blocked") {
      counters.blocked += 1;
    } else if (task.status === "done") {
      counters.done += 1;
    }
  }
  return counters;
};

const buildPriorityCountMap = (tasks: readonly TaskRow[]): Record<number, number> => {
  const counters: Record<number, number> = {};
  for (const task of tasks) {
    counters[task.priority] = (counters[task.priority] ?? 0) + 1;
  }
  return counters;
};

const activeTaskCountsByStatus = computed(() =>
  buildStatusCountMap(activeTaskRows.value),
);
const filteredTaskCountsByStatus = computed(() =>
  buildStatusCountMap(filteredTaskRows.value),
);
const activeTaskCountsByPriority = computed(() =>
  buildPriorityCountMap(activeTaskRows.value),
);

const workflowSlices = computed(() => {
  const statusCounts = activeTaskCountsByStatus.value;
  return MY_WORK_WORKFLOW_SLICE_DEFINITIONS.map((definition) => ({
    label: definition.label,
    value: statusCounts[definition.status] ?? 0,
    color: definition.color,
  }));
});

const taskStatusBars = computed(() => {
  const statusCounts = filteredTaskCountsByStatus.value;
  return MY_WORK_TASK_STATUS_BAR_DEFINITIONS.map((definition) => ({
    label: definition.label,
    value: statusCounts[definition.status] ?? 0,
    color: definition.color,
  }));
});

const priorityBars = computed(() => {
  const priorityCounts = activeTaskCountsByPriority.value;
  return MY_WORK_PRIORITY_BAR_DEFINITIONS.map((definition) => ({
    label: definition.label,
    value: priorityCounts[definition.priority] ?? 0,
    color: definition.color,
  }));
});

const projectProgressBars = computed(() => {
  return myProjects.value.map((project) => ({
    label: project.name,
    value: getProjectProgress(project.id),
    color: MY_WORK_PROJECT_PROGRESS_BAR_COLOR,
  }));
});

const completionValue = computed(() => {
  const total = activeTaskRows.value.length;
  const done = doneTaskRows.value.length;
  return `${done}/${total}`;
});
</script>

<template>
  <section
    class="mw-page"
    :data-projects-visible="showProjects ? 'true' : 'false'"
    aria-label="Meu Trabalho"
  >
    <header class="mw-header">
      <div class="mw-header-copy">
        <h1 class="mw-title">Meu Trabalho</h1>
        <p class="mw-subtitle">
          Visão de execução das suas tarefas e projetos ativos
          <strong>({{ meEmail }})</strong>
        </p>
        <p class="mw-role">Função técnica: {{ professionalRole }}</p>
      </div>
      <div class="mw-header-actions">
        <span
          v-if="syncing"
          class="mw-sync-badge"
          role="status"
          aria-live="polite"
        >
          <span class="mw-sync-badge__spinner" aria-hidden="true"></span>
          Atualizando dados…
        </span>
        <button
          class="btn btn-ghost"
          type="button"
          title="Exportar tarefas do filtro atual"
          @click="handleOpenExportModal"
        >
          Exportar...
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="loading"
          @click="refresh"
        >
          {{ loading ? "Carregando..." : "Recarregar" }}
        </button>
      </div>
    </header>

    <section class="mw-filter-shell card" aria-label="Filtros de trabalho">
      <div class="mw-tabs-group">
        <h2 class="mw-tabs-title">Status</h2>
        <div class="mw-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.id"
            type="button"
            class="mw-tab"
            :aria-pressed="statusFilter === tab.id ? 'true' : 'false'"
            @click="statusFilter = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="mw-tabs-group">
        <h2 class="mw-tabs-title">Prioridade</h2>
        <div class="mw-tabs">
          <button
            v-for="tab in priorityTabs"
            :key="tab.id"
            type="button"
            class="mw-tab"
            :aria-pressed="priorityFilter === tab.id ? 'true' : 'false'"
            @click="priorityFilter = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="mw-tabs-group">
        <h2 class="mw-tabs-title">Exibição</h2>
        <div class="mw-tabs">
          <button
            type="button"
            class="mw-tab"
            :aria-pressed="showProjects ? 'true' : 'false'"
            @click="showProjects = !showProjects"
          >
            {{ showProjects ? "Ocultar Projetos" : "Mostrar Projetos" }}
          </button>
          <button
            type="button"
            class="mw-tab"
            :aria-pressed="showCharts ? 'true' : 'false'"
            @click="showCharts = !showCharts"
          >
            {{ showCharts ? "Ocultar Gráficos" : "Mostrar Gráficos" }}
          </button>
        </div>
      </div>
    </section>

    <div class="mw-stats" role="status" aria-live="polite">
      <article class="mw-stat-card">
        <p class="mw-stat-value">{{ filteredTaskRows.length }}</p>
        <p class="mw-stat-label">{{ filteredTaskLabel }}</p>
      </article>
      <article class="mw-stat-card">
        <p class="mw-stat-value">{{ pendingTasks.length }}</p>
        <p class="mw-stat-label">Total Pendentes</p>
      </article>
      <article class="mw-stat-card mw-stat-card--danger">
        <p class="mw-stat-value">{{ highPriorityTasks.length }}</p>
        <p class="mw-stat-label">Alta Prioridade (P1/P2)</p>
      </article>
      <article class="mw-stat-card">
        <p class="mw-stat-value">{{ myProjects.length }}</p>
        <p class="mw-stat-label">Meus Projetos</p>
      </article>
    </div>

    <div class="mw-grid" :class="{ 'mw-grid--without-projects': !showProjects }">
      <div class="mw-main">
        <div class="mw-main-highlight">
          <section class="mw-section card">
            <div class="mw-section-head">
              <h2 class="mw-section-title">Foco Atual</h2>
              <span class="mw-counter">{{ focusedTaskRows.length }} itens</span>
            </div>
            <div v-if="!focusedTaskRows.length" class="mw-empty">
              Nenhuma tarefa para o filtro selecionado.
            </div>
            <div v-else class="mw-list">
              <article
                v-for="task in focusedTaskRows"
                :key="task.id"
                class="mw-task-item"
                @click="openTask(task)"
              >
                <header class="mw-task-header">
                  <span class="badge-p" :data-p="task.priority">
                    {{ priorityLabel(task.priority) }}
                  </span>
                  <span :class="['mw-status-pill', statusToneClass(task.status)]">
                    {{ statusLabel(task.status) }}
                  </span>
                </header>
                <h3 class="mw-task-title">{{ task.title }}</h3>
                <p class="mw-task-meta">
                  {{ getProjectLabel(task.projectId) }}
                  <span v-if="task.dueAt">· Prazo {{ task.dueAt.slice(0, 10) }}</span>
                </p>
              </article>
            </div>
          </section>

          <section class="mw-section mw-section--deadlines card">
            <div class="mw-section-head">
              <h2 class="mw-section-title">Próximos Prazos</h2>
              <span class="mw-counter">{{ upcomingDeadlines.length }} itens</span>
            </div>
            <div v-if="!upcomingDeadlines.length" class="mw-empty">
              Nenhum prazo nos próximos 7 dias.
            </div>
            <div v-else class="mw-list">
              <article
                v-for="task in upcomingDeadlines"
                :key="task.id"
                class="mw-task-item"
                @click="openTask(task)"
              >
                <header class="mw-task-header">
                  <span class="badge-p" :data-p="task.priority">
                    {{ priorityLabel(task.priority) }}
                  </span>
                  <span class="mw-status-pill mw-status-tone-warning">
                    {{ task.dueAt?.slice(0, 10) }}
                  </span>
                </header>
                <h3 class="mw-task-title">{{ task.title }}</h3>
                <p class="mw-task-meta">{{ getProjectLabel(task.projectId) }}</p>
              </article>
            </div>
          </section>
        </div>

        <section class="mw-section card">
          <div class="mw-section-head">
            <h2 class="mw-section-title">Minhas Tarefas</h2>
            <span class="mw-counter">{{ filteredTaskRows.length }} itens</span>
          </div>

          <div v-if="!filteredTaskRows.length" class="mw-empty">
            Nenhuma tarefa para este filtro.
          </div>

          <div v-else class="mw-table-wrapper">
            <table class="mw-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Projeto</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in pagedTaskRows"
                  :key="task.id"
                  @click="openTask(task)"
                >
                  <td class="mw-cell-title">{{ task.title }}</td>
                  <td>
                    <span :class="['mw-status-pill', statusToneClass(task.status)]">
                      {{ statusLabel(task.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="badge-p" :data-p="task.priority">
                      {{ priorityLabel(task.priority) }}
                    </span>
                  </td>
                  <td>{{ getProjectLabel(task.projectId) }}</td>
                  <td>{{ task.dueAt ? task.dueAt.slice(0, 10) : "Sem prazo" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <nav
            class="mw-table-pager"
            aria-label="Paginação da tabela de tarefas"
          >
            <p class="mw-table-pager__summary" aria-live="polite">
              Exibindo {{ taskTableFirstVisible }}-{{ taskTableLastVisible }} de
              {{ filteredTaskRows.length }} tarefas
            </p>
            <label class="mw-table-pager__size">
              <span>Linhas por página</span>
              <select
                class="mw-table-pager__select"
                :value="taskTablePageSize"
                @change="
                  setTaskTablePageSize(
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option
                  v-for="size in TASK_TABLE_PAGE_SIZE_OPTIONS"
                  :key="size"
                  :value="size"
                >
                  {{ size }}
                </option>
              </select>
            </label>
            <div class="mw-table-pager__actions">
              <button
                class="btn btn-ghost"
                type="button"
                :disabled="taskTablePage <= 1"
                @click="setTaskTablePage(taskTablePage - 1)"
              >
                Anterior
              </button>
              <span class="mw-table-pager__page">
                Página {{ taskTablePage }} de {{ taskTableTotalPages }}
              </span>
              <button
                class="btn btn-ghost"
                type="button"
                :disabled="taskTablePage >= taskTableTotalPages"
                @click="setTaskTablePage(taskTablePage + 1)"
              >
                Próxima
              </button>
            </div>
          </nav>
        </section>
      </div>

      <aside v-show="showProjects" class="mw-aside">
        <section class="mw-section card">
          <div class="mw-section-head">
            <h2 class="mw-section-title">Meus Projetos</h2>
            <span class="mw-counter">{{ myProjects.length }} ativos</span>
          </div>

          <div v-if="!myProjects.length && !clientStats.length" class="mw-empty">
            Nenhum projeto vinculado no momento.
          </div>

          <div v-if="clientStats.length" class="mw-info-card">
            <h3 class="mw-info-title">Desempenho por Cliente</h3>
            <div v-for="client in clientStats" :key="client.name" class="mw-client-row">
              <div class="mw-client-header">
                <span class="mw-client-name">{{ client.name }}</span>
                <span class="mw-client-count">{{ client.done }}/{{ client.total }}</span>
              </div>
              <p class="mw-client-role">Contato técnico: {{ client.role }}</p>
              <div class="mw-progress-track">
                <div class="mw-progress-fill" :style="{ width: `${client.pct}%` }"></div>
              </div>
            </div>
          </div>

          <div v-if="bestConnectedClients.length" class="mw-info-card">
            <h3 class="mw-info-title">Clientes Mais Conectados</h3>
            <ul class="mw-connected-list">
              <li v-for="client in bestConnectedClients" :key="client.name">
                <span>{{ client.name }}</span>
                <span>{{ client.total }} interações · {{ client.role }}</span>
              </li>
            </ul>
          </div>

          <ul v-if="myProjects.length" class="mw-list">
            <li v-for="project in myProjects" :key="project.id" class="mw-project-item">
              <header class="mw-project-head">
                <span class="mw-project-name">{{ project.name }}</span>
                <span class="mw-project-status">{{ project.status }}</span>
              </header>
              <p class="mw-project-code">{{ project.code }}</p>
              <div class="mw-progress-track">
                <div
                  class="mw-progress-fill"
                  :style="{ width: `${getProjectProgress(project.id)}%` }"
                ></div>
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <section v-show="showCharts" class="mw-charts" aria-label="Gráficos de progresso">
      <article class="mw-chart-card card">
        <h2 class="mw-section-title">Progresso Geral</h2>
        <div class="mw-chart-body mw-chart-body--centered">
          <Suspense>
            <template #default>
              <DonutChart
                :slices="workflowSlices"
                :center-value="completionValue"
                center-label="Concluídas / Total"
                :size="170"
                :stroke-width="24"
              />
            </template>
            <template #fallback>
              <div class="mw-async-fallback" role="status" aria-live="polite">
                <span class="mw-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando gráfico de progresso…</span>
              </div>
            </template>
          </Suspense>
        </div>
      </article>

      <article class="mw-chart-card card">
        <h2 class="mw-section-title">Status das Tarefas</h2>
        <div class="mw-chart-body">
          <Suspense>
            <template #default>
              <BarChart :bars="taskStatusBars" :horizontal="true" :height="220" />
            </template>
            <template #fallback>
              <div class="mw-async-fallback" role="status" aria-live="polite">
                <span class="mw-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando status das tarefas…</span>
              </div>
            </template>
          </Suspense>
        </div>
      </article>

      <article class="mw-chart-card card">
        <h2 class="mw-section-title">Prioridade x Volume</h2>
        <div class="mw-chart-body">
          <Suspense>
            <template #default>
              <BarChart :bars="priorityBars" :height="220" :max-bar-width="54" />
            </template>
            <template #fallback>
              <div class="mw-async-fallback" role="status" aria-live="polite">
                <span class="mw-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando gráfico de prioridades…</span>
              </div>
            </template>
          </Suspense>
        </div>
      </article>

      <article class="mw-chart-card card mw-chart-card--span-2">
        <h2 class="mw-section-title">Progresso por Projeto</h2>
        <div v-if="projectProgressBars.length" class="mw-chart-body">
          <Suspense>
            <template #default>
              <BarChart :bars="projectProgressBars" :horizontal="true" :height="240" />
            </template>
            <template #fallback>
              <div class="mw-async-fallback" role="status" aria-live="polite">
                <span class="mw-async-fallback__spinner" aria-hidden="true"></span>
                <span>Carregando progresso por projeto…</span>
              </div>
            </template>
          </Suspense>
        </div>
        <p v-else class="mw-empty">Sem dados de progresso por projeto.</p>
      </article>
    </section>

    <div class="mw-panel-row">
      <Suspense v-if="$route.query.taskId">
        <template #default>
          <TaskDetailPanel />
        </template>
        <template #fallback>
          <div
            class="mw-async-fallback mw-async-fallback--panel"
            role="status"
            aria-live="polite"
          >
            <span class="mw-async-fallback__spinner" aria-hidden="true"></span>
            <span>Carregando detalhes da tarefa…</span>
          </div>
        </template>
      </Suspense>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "../styles/pages/dashboard-my-work.module";
</style>
