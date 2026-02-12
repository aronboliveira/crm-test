<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useProjectsStore } from "../../pinia/stores/projects.store";
import { useTasksStore } from "../../pinia/stores/tasks.store";
import ModalService from "../../services/ModalService";
import AlertService from "../../services/AlertService";
import ReportsMetricsService from "../../services/ReportsMetricsService";
import {
  REPORTS_EMPTY_VALUE_LABEL,
  REPORTS_EXPORT_PROJECT_TYPE_LABEL,
  REPORTS_EXPORT_TASK_TYPE_LABEL,
  REPORTS_PRIORITY_COLORS,
  REPORTS_PRIORITY_LABELS,
  REPORTS_STATUS_COLORS,
  REPORTS_STATUS_LABELS,
} from "../../utils/constants/dashboard-reports.constants";
import {
  DASHBOARD_REPORTS_EXPORT_CENTERED_COLUMNS,
  DASHBOARD_REPORTS_EXPORT_COLUMNS,
  DASHBOARD_REPORTS_EXPORT_COLUMN_KEYS,
  DASHBOARD_REPORTS_EXPORT_COLUMN_WIDTHS,
  DashboardReportsCsvBlueprint,
  SpreadsheetExporter,
  type DashboardReportsExportColumnKey,
  type DashboardReportsExportRow,
  type SpreadsheetExportFormat,
} from "../../utils/export";

const router = useRouter();
const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();
const busy = ref(false);
const loadError = ref<string | null>(null);

const DashboardTableExportModal = defineAsyncComponent(
  () => import("./DashboardTableExportModal.vue"),
);

const loadReportsData = async (): Promise<void> => {
  busy.value = true;
  loadError.value = null;

  try {
    const loaders: Array<{ source: string; run: () => Promise<unknown> }> = [];

    if (!projectsStore.rows.length) {
      loaders.push({
        source: "projetos",
        run: () => projectsStore.list({ reset: true }),
      });
    }

    if (!tasksStore.rows.length) {
      loaders.push({
        source: "tarefas",
        run: () => tasksStore.list({ reset: true }),
      });
    }

    if (!loaders.length) return;

    const settled = await Promise.allSettled(loaders.map((loader) => loader.run()));
    const rejected = settled
      .map((result, index) => ({
        result,
        source: loaders[index]?.source || "desconhecido",
      }))
      .filter(
        (
          item,
        ): item is {
          result: PromiseRejectedResult;
          source: string;
        } => item.result.status === "rejected",
      );

    if (!rejected.length) return;

    const reasonMessage = ReportsMetricsService.combineErrorMessages(
      rejected.map((item) => item.result.reason),
      "Falha ao carregar dados de relatórios.",
    );

    loadError.value = reasonMessage;
    console.error(
      "[ReportsView] Load failures:",
      rejected.map((item) => `${item.source}: ${ReportsMetricsService.toErrorMessage(item.result.reason, "erro")}`),
    );

    await AlertService.error("Erro ao carregar relatórios", reasonMessage);
  } catch (caughtError) {
    const message = ReportsMetricsService.toErrorMessage(
      caughtError,
      "Falha inesperada ao atualizar relatórios.",
    );
    loadError.value = message;
    console.error("[ReportsView] loadReportsData failed:", message);
    await AlertService.error("Erro ao carregar relatórios", message);
  } finally {
    busy.value = false;
  }
};

onMounted(() => {
  void loadReportsData();
});

const goBack = () => router.push("/dashboard");

const projects = computed(() => ReportsMetricsService.normalizeProjects(projectsStore.rows));
const tasks = computed(() => ReportsMetricsService.normalizeTasks(tasksStore.rows));

const projectStatusCounts = computed(() =>
  ReportsMetricsService.buildStatusCounts(projects.value),
);

const taskSummary = computed(() => ReportsMetricsService.buildTaskSummary(tasks.value));

const taskStatusCounts = computed(() => taskSummary.value.statusCounts);
const taskPriorityCounts = computed(() => taskSummary.value.priorityCounts);

const completionRate = computed(() =>
  ReportsMetricsService.calculateCompletionRate(
    taskSummary.value.doneCount,
    tasks.value.length,
  ),
);

const blockedTasks = computed(() => taskSummary.value.blockedCount);
const overdueTasks = computed(() => taskSummary.value.overdueCount);
const dueThisWeek = computed(() => taskSummary.value.dueThisWeekCount);

const avgTasksPerProject = computed(() =>
  ReportsMetricsService.calculateAverage(tasks.value.length, projects.value.length, 1),
);

const uniqueAssignees = computed(() => taskSummary.value.uniqueAssigneesCount);

const projectCompletionRates = computed(
  () => taskSummary.value.projectCompletionByProjectId,
);

const assigneeWorkload = computed(() =>
  ReportsMetricsService.rankAssigneeWorkload(taskSummary.value.assigneeCounts, 8),
);

const projectArcs = computed(() =>
  ReportsMetricsService.buildArcs(
    ReportsMetricsService.makeSlices(
      projectStatusCounts.value,
      REPORTS_STATUS_COLORS,
      REPORTS_STATUS_LABELS,
    ),
  ),
);

const taskArcs = computed(() =>
  ReportsMetricsService.buildArcs(
    ReportsMetricsService.makeSlices(
      taskStatusCounts.value,
      REPORTS_STATUS_COLORS,
      REPORTS_STATUS_LABELS,
    ),
  ),
);

const priorityBars = computed(() =>
  ReportsMetricsService.buildPriorityBars(
    taskPriorityCounts.value,
    REPORTS_PRIORITY_LABELS,
    REPORTS_PRIORITY_COLORS,
  ),
);

const workloadBars = computed(() =>
  ReportsMetricsService.buildWorkloadBars(assigneeWorkload.value),
);

const projectTableRows = computed(() =>
  projects.value.map((project) => {
    const completion = projectCompletionRates.value[project.id] || {
      total: 0,
      done: 0,
    };

    const completionPercentage = completion.total
      ? ReportsMetricsService.calculateCompletionRate(completion.done, completion.total)
      : 0;

    return {
      id: project.id,
      code: project.code || REPORTS_EMPTY_VALUE_LABEL,
      name: project.name || REPORTS_EMPTY_VALUE_LABEL,
      status: project.status,
      statusLabel: REPORTS_STATUS_LABELS[project.status] || project.status,
      owner: project.ownerEmail || REPORTS_EMPTY_VALUE_LABEL,
      due: ReportsMetricsService.formatDateLabel(project.dueAt),
      tasks: completion.total,
      completionPercentage,
    };
  }),
);

const taskTableRows = computed(() =>
  tasks.value.map((task) => ({
    id: task.id,
    title: task.title || REPORTS_EMPTY_VALUE_LABEL,
    status: task.status,
    statusLabel: REPORTS_STATUS_LABELS[task.status] || task.status,
    priority: REPORTS_PRIORITY_LABELS[task.priority] || REPORTS_EMPTY_VALUE_LABEL,
    assignee: task.assigneeEmail || REPORTS_EMPTY_VALUE_LABEL,
    due: ReportsMetricsService.formatDateLabel(task.dueAt),
  })),
);

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...DASHBOARD_REPORTS_EXPORT_COLUMN_KEYS,
] as DashboardReportsExportColumnKey[];

const reportsExporter = new SpreadsheetExporter<
  DashboardReportsExportRow,
  DashboardReportsExportColumnKey,
  DashboardReportsCsvBlueprint
>({
  fileNamePrefix: "relatorios-dashboard",
  sheetName: "Relatórios",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) =>
    new DashboardReportsCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: DASHBOARD_REPORTS_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: DASHBOARD_REPORTS_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey === "tipo") {
      if (record.tipo === REPORTS_EXPORT_PROJECT_TYPE_LABEL) {
        return {
          fillColor: "FFEFF6FF",
          fontColor: "FF1E3A8A",
          bold: true,
          align: "center",
        };
      }

      if (record.tipo === REPORTS_EXPORT_TASK_TYPE_LABEL) {
        return {
          fillColor: "FFF5F3FF",
          fontColor: "FF5B21B6",
          bold: true,
          align: "center",
        };
      }

      return null;
    }

    if (columnKey === "status" && record.status === "Bloqueado") {
      return {
        fillColor: "FFFEE2E2",
        fontColor: "FFB91C1C",
        bold: true,
        align: "center",
      };
    }

    if (columnKey === "progresso") {
      const numericValue = Number.parseInt(String(record.progresso), 10);
      if (Number.isNaN(numericValue)) return null;
      if (numericValue >= 80) {
        return {
          fillColor: "FFECFDF5",
          fontColor: "FF166534",
          bold: true,
          align: "center",
        };
      }
      if (numericValue <= 40) {
        return {
          fillColor: "FFFFF7ED",
          fontColor: "FF9A3412",
          bold: true,
          align: "center",
        };
      }
    }

    return null;
  },
});

const reportExportRows = computed<DashboardReportsExportRow[]>(() => [
  ...projectTableRows.value.map((project) => ({
    tipo: REPORTS_EXPORT_PROJECT_TYPE_LABEL,
    codigo: project.code,
    item: project.name,
    status: project.statusLabel,
    responsavel: project.owner,
    prioridade: REPORTS_EMPTY_VALUE_LABEL,
    entrega: project.due,
    tarefas: project.tasks,
    progresso: `${project.completionPercentage}%`,
  })),
  ...taskTableRows.value.map((task) => ({
    tipo: REPORTS_EXPORT_TASK_TYPE_LABEL,
    codigo: REPORTS_EMPTY_VALUE_LABEL,
    item: task.title,
    status: task.statusLabel,
    responsavel: task.assignee,
    prioridade: task.priority,
    entrega: task.due,
    tarefas: "" as const,
    progresso: REPORTS_EMPTY_VALUE_LABEL,
  })),
]);

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Relatórios",
        size: "md",
        data: {
          totalRows: reportExportRows.value.length,
          entityLabel: "linha(s)",
          columnOptions: DASHBOARD_REPORTS_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  try {
    const selection = await openExportDialog();
    if (!selection) return;

    const records = reportExportRows.value;
    if (!records.length) {
      await AlertService.error("Exportação", "Não há dados para exportar.");
      return;
    }

    const exportedFormats = await reportsExporter.export(records, {
      formats: selection.formats,
      columnKeys: selection.columnKeys as DashboardReportsExportColumnKey[],
    });

    await AlertService.success(
      "Exportação concluída",
      `${exportedFormats.map((format) => format.toUpperCase()).join(" e ")} gerado(s) com sucesso.`,
    );
  } catch (caughtError) {
    const message = ReportsMetricsService.toErrorMessage(
      caughtError,
      "Falha ao exportar relatórios.",
    );
    console.error("[ReportsView] Export failed:", message);
    await AlertService.error("Erro ao exportar", message);
  }
};
</script>

<template>
  <div class="reports">
    <header class="reports__header">
      <div class="reports__header-main">
        <button
          class="btn btn-ghost reports__back"
          type="button"
          title="Voltar ao painel"
          @click="goBack"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="reports__back-icon"
          >
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Voltar
        </button>
        <div>
          <h1 class="reports__title">Relatórios &amp; Análises</h1>
          <p class="reports__subtitle">
            Visão geral das métricas de gerenciamento de projetos e tarefas.
          </p>
        </div>
      </div>
      <button
        class="btn btn-ghost"
        type="button"
        title="Exportar visão consolidada de relatórios"
        @click="handleOpenExportModal"
      >
        Exportar...
      </button>
    </header>

    <section v-if="busy" class="reports__state-card reports__state-card--busy card" aria-live="polite">
      Atualizando dados de relatórios...
    </section>

    <template v-else>
      <section v-if="loadError" class="reports__state-card reports__state-card--error card" role="alert">
        {{ loadError }}
      </section>

      <section class="reports__kpis">
        <div class="kpi-card">
          <span class="kpi-card__label">Total de Projetos</span>
          <span class="kpi-card__value">{{ projects.length }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Total de Tarefas</span>
          <span class="kpi-card__value">{{ tasks.length }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Taxa de Conclusão</span>
          <span class="kpi-card__value">{{ completionRate }}%</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Projetos Ativos</span>
          <span class="kpi-card__value">{{ projectStatusCounts["active"] || 0 }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Tarefas Bloqueadas</span>
          <span class="kpi-card__value kpi-card__value--danger">{{ blockedTasks }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Tarefas Atrasadas</span>
          <span class="kpi-card__value kpi-card__value--danger">{{ overdueTasks }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Vencem esta Semana</span>
          <span class="kpi-card__value kpi-card__value--warn">{{ dueThisWeek }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Membros Ativos</span>
          <span class="kpi-card__value">{{ uniqueAssignees }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Média Tarefas/Projeto</span>
          <span class="kpi-card__value">{{ avgTasksPerProject }}</span>
        </div>
      </section>

      <section class="reports__charts">
        <div class="chart-card card">
          <h3 class="chart-card__title">Status dos Projetos</h3>
          <div class="chart-card__body">
            <svg
              viewBox="0 0 180 180"
              class="donut-chart"
              role="img"
              aria-label="Distribuição de status dos projetos"
            >
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="var(--border-1)"
                stroke-width="18"
              />
              <path
                v-for="(arc, index) in projectArcs"
                :key="`project-arc-${index}`"
                :d="arc.d"
                fill="none"
                :stroke="arc.color"
                stroke-width="18"
                stroke-linecap="round"
              >
                <title>{{ arc.label }}: {{ arc.pct }}%</title>
              </path>
              <text x="90" y="86" text-anchor="middle" class="donut-chart__center-value">
                {{ projects.length }}
              </text>
              <text x="90" y="102" text-anchor="middle" class="donut-chart__center-label">
                projetos
              </text>
            </svg>
            <ul class="chart-legend">
              <li
                v-for="arc in projectArcs"
                :key="`project-legend-${arc.label}`"
                class="chart-legend__item"
              >
                <span class="chart-legend__dot" :style="{ background: arc.color }"></span>
                <span class="chart-legend__label">{{ arc.label }}</span>
                <span class="chart-legend__value">{{ arc.pct }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-card__title">Status das Tarefas</h3>
          <div class="chart-card__body">
            <svg
              viewBox="0 0 180 180"
              class="donut-chart"
              role="img"
              aria-label="Distribuição de status das tarefas"
            >
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="var(--border-1)"
                stroke-width="18"
              />
              <path
                v-for="(arc, index) in taskArcs"
                :key="`task-arc-${index}`"
                :d="arc.d"
                fill="none"
                :stroke="arc.color"
                stroke-width="18"
                stroke-linecap="round"
              >
                <title>{{ arc.label }}: {{ arc.pct }}%</title>
              </path>
              <text x="90" y="86" text-anchor="middle" class="donut-chart__center-value">
                {{ tasks.length }}
              </text>
              <text x="90" y="102" text-anchor="middle" class="donut-chart__center-label">
                tarefas
              </text>
            </svg>
            <ul class="chart-legend">
              <li
                v-for="arc in taskArcs"
                :key="`task-legend-${arc.label}`"
                class="chart-legend__item"
              >
                <span class="chart-legend__dot" :style="{ background: arc.color }"></span>
                <span class="chart-legend__label">{{ arc.label }}</span>
                <span class="chart-legend__value">{{ arc.pct }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-card__title">Tarefas por Prioridade</h3>
          <div class="bar-chart">
            <div
              v-for="bar in priorityBars"
              :key="`priority-${bar.label}`"
              class="bar-chart__row"
            >
              <span class="bar-chart__label">{{ bar.label }}</span>
              <div class="bar-chart__track">
                <div class="bar-chart__fill" :style="{ width: `${bar.pct}%`, background: bar.color }"></div>
              </div>
              <span class="bar-chart__count">{{ bar.count }}</span>
            </div>
            <p v-if="!priorityBars.length" class="bar-chart__empty">Sem dados de tarefas</p>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-card__title">Carga por Responsável</h3>
          <div class="bar-chart">
            <div
              v-for="bar in workloadBars"
              :key="`workload-${bar.label}`"
              class="bar-chart__row"
            >
              <span class="bar-chart__label bar-chart__label--wide">{{ bar.label }}</span>
              <div class="bar-chart__track">
                <div class="bar-chart__fill" :style="{ width: `${bar.pct}%`, background: bar.color }"></div>
              </div>
              <span class="bar-chart__count">{{ bar.count }}</span>
            </div>
            <p v-if="!workloadBars.length" class="bar-chart__empty">
              Nenhum responsável atribuído
            </p>
          </div>
        </div>
      </section>

      <section class="reports__tables">
        <div class="table-section card">
          <h3 class="chart-card__title">Projetos</h3>
          <div class="table-section__wrap">
            <table v-if="projectTableRows.length" class="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Entrega</th>
                  <th>Tarefas</th>
                  <th>Progresso</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="project in projectTableRows" :key="project.id">
                  <td class="td-strong">{{ project.code }}</td>
                  <td>{{ project.name }}</td>
                  <td>
                    <span class="badge" :class="`badge--${project.status}`">{{ project.statusLabel }}</span>
                  </td>
                  <td class="td-muted">{{ project.owner }}</td>
                  <td class="td-muted">{{ project.due }}</td>
                  <td class="td-muted">{{ project.tasks }}</td>
                  <td>
                    <div class="progress-cell">
                      <div class="progress-cell__track">
                        <div class="progress-cell__fill" :style="{ width: `${project.completionPercentage}%` }"></div>
                      </div>
                      <span class="progress-cell__text">{{ project.completionPercentage }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="table-section__empty">Nenhum projeto.</p>
          </div>
        </div>

        <div class="table-section card">
          <h3 class="chart-card__title">Tarefas</h3>
          <div class="table-section__wrap">
            <table v-if="taskTableRows.length" class="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Responsável</th>
                  <th>Entrega</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in taskTableRows" :key="task.id">
                  <td class="td-strong">{{ task.title }}</td>
                  <td>
                    <span class="badge" :class="`badge--${task.status}`">{{ task.statusLabel }}</span>
                  </td>
                  <td>{{ task.priority }}</td>
                  <td class="td-muted">{{ task.assignee }}</td>
                  <td class="td-muted">{{ task.due }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="table-section__empty">Nenhuma tarefa.</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/pages/reports-view.module";
</style>
