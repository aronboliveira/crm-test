<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useProjectsStore } from "../../pinia/stores/projects.store";
import { useTasksStore } from "../../pinia/stores/tasks.store";
import type { TaskPriority } from "../../pinia/types/tasks.types";

const router = useRouter();
const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();
const busy = ref(false);

onMounted(async () => {
  busy.value = true;
  try {
    await Promise.all([
      projectsStore.rows.length
        ? Promise.resolve()
        : projectsStore.list({ reset: true }),
      tasksStore.rows.length
        ? Promise.resolve()
        : tasksStore.list({ reset: true }),
    ]);
  } finally {
    busy.value = false;
  }
});

const goBack = () => router.push("/dashboard");

/* ---- Computed metrics ---- */
const projects = computed(() =>
  projectsStore.rows.filter((p): p is NonNullable<typeof p> => !!p),
);
const tasks = computed(() =>
  tasksStore.rows.filter((t): t is NonNullable<typeof t> => !!t),
);

const projectStatusCounts = computed(() => {
  const map: Record<string, number> = {};
  for (const p of projects.value) map[p.status] = (map[p.status] || 0) + 1;
  return map;
});

const taskStatusCounts = computed(() => {
  const map: Record<string, number> = {};
  for (const t of tasks.value) map[t.status] = (map[t.status] || 0) + 1;
  return map;
});

const taskPriorityCounts = computed(() => {
  const map: Record<number, number> = {};
  for (const t of tasks.value) map[t.priority] = (map[t.priority] || 0) + 1;
  return map;
});

const completionRate = computed(() => {
  const total = tasks.value.length;
  if (!total) return 0;
  return Math.round(
    (tasks.value.filter((t) => t.status === "done").length / total) * 100,
  );
});

/* ---- Extra KPIs ---- */
const blockedTasks = computed(
  () => tasks.value.filter((t) => t.status === "blocked").length,
);

const overdueTasks = computed(() => {
  const now = new Date().toISOString().split("T")[0];
  return !now
    ? 0
    : tasks.value.filter((t) => {
        const dueDate = t.dueAt?.split("T")?.[0];
        if (!dueDate) return false;
        return dueDate < now && t.status !== "done";
      }).length;
});

const avgTasksPerProject = computed(() => {
  const pCount = projects.value.length;
  if (!pCount) return 0;
  return Math.round((tasks.value.length / pCount) * 10) / 10;
});

const uniqueAssignees = computed(() => {
  const set = new Set<string>();
  for (const t of tasks.value) {
    if (t.assigneeEmail) set.add(t.assigneeEmail.toLowerCase());
  }
  return set.size;
});

const projectCompletionRates = computed(() => {
  const map: Record<string, { total: number; done: number }> = {};
  for (const t of tasks.value) {
    if (!t.projectId) continue;
    if (!map[t.projectId]) map[t.projectId] = { total: 0, done: 0 };
    const entry = map[t.projectId];
    if (entry) {
      entry.total++;
      if (t.status === "done") entry.done++;
    }
  }
  return map;
});

/* ---- Assignee workload ---- */
const assigneeWorkload = computed(() => {
  const map: Record<string, number> = {};
  for (const t of tasks.value) {
    const email = t.assigneeEmail || "Não atribuído";
    map[email] = (map[email] || 0) + 1;
  }
  return Object.entries(map)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
});

/* ---- Due this week ---- */
const dueThisWeek = computed(() => {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const nowStr = now.toISOString().split("T")[0];
  const endStr = weekEnd.toISOString().split("T")[0];

  return tasks.value.filter((t) => {
    if (!t.dueAt || t.status === "done") return false;
    const dueDate = t.dueAt.split("T")[0];
    if (!dueDate || !nowStr || !endStr) return false;
    return dueDate >= nowStr && dueDate <= endStr;
  }).length;
});

/* ---- Chart helpers ---- */
const statusColors: Record<string, string> = {
  planned: "#f59e0b",
  active: "#16a34a",
  blocked: "#ef4444",
  done: "#0ea5e9",
  archived: "#94a3b8",
  todo: "#94a3b8",
  doing: "#0ea5e9",
};

const statusLabels: Record<string, string> = {
  planned: "Planejado",
  active: "Ativo",
  blocked: "Bloqueado",
  done: "Concluído",
  archived: "Arquivado",
  todo: "A Fazer",
  doing: "Em Progresso",
};

const priorityColors: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#16a34a",
  5: "#94a3b8",
};

const priorityLabels: Record<number, string> = {
  1: "Crítica",
  2: "Alta",
  3: "Média",
  4: "Baixa",
  5: "Mínima",
};

/* ---- Donut arcs ---- */
type Slice = { label: string; value: number; color: string; pct: number };

function makeSlices(
  map: Record<string, number>,
  colors: Record<string, string>,
  labels?: Record<string, string>,
): Slice[] {
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: labels?.[k] || k,
      value: v,
      color: colors[k] || "#64748b",
      pct: Math.round((v / total) * 100),
    }));
}

function donutPath(
  startAngle: number,
  endAngle: number,
  r: number = 70,
  cx: number = 90,
  cy: number = 90,
): string {
  const sr = (startAngle - 90) * (Math.PI / 180);
  const er = (endAngle - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(sr);
  const y1 = cy + r * Math.sin(sr);
  const x2 = cx + r * Math.cos(er);
  const y2 = cy + r * Math.sin(er);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function buildArcs(slices: Slice[]) {
  const arcs: { d: string; color: string; label: string; pct: number }[] = [];
  let angle = 0;
  for (const s of slices) {
    const sweep = (s.pct / 100) * 360;
    if (sweep < 0.5) continue;
    const clampedSweep = Math.min(sweep, 359.99);
    arcs.push({
      d: donutPath(angle, angle + clampedSweep),
      color: s.color,
      label: s.label,
      pct: s.pct,
    });
    angle += sweep;
  }
  return arcs;
}

const projectArcs = computed(() =>
  buildArcs(makeSlices(projectStatusCounts.value, statusColors, statusLabels)),
);
const taskArcs = computed(() =>
  buildArcs(makeSlices(taskStatusCounts.value, statusColors, statusLabels)),
);

/* ---- Bar chart data ---- */
const priorityBars = computed(() => {
  const entries = Object.entries(taskPriorityCounts.value)
    .map(([k, v]) => ({ key: Number(k) as TaskPriority, count: v }))
    .sort((a, b) => a.key - b.key);
  const max = Math.max(...entries.map((e) => e.count), 1);
  return entries.map((e) => ({
    label: priorityLabels[e.key] || `P${e.key}`,
    count: e.count,
    pct: Math.round((e.count / max) * 100),
    color: priorityColors[e.key] || "#64748b",
  }));
});

const workloadBars = computed(() => {
  const max = Math.max(...assigneeWorkload.value.map((a) => a.count), 1);
  return assigneeWorkload.value.map((a) => ({
    label: a.email.length > 22 ? a.email.slice(0, 20) + "…" : a.email,
    count: a.count,
    pct: Math.round((a.count / max) * 100),
    color: "#6366f1",
  }));
});

/* ---- Date formatting ---- */
const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

/* ---- Summary table data ---- */
const projectTableRows = computed(() =>
  projects.value.map((p) => {
    const stats = projectCompletionRates.value[p.id] || {
      total: 0,
      done: 0,
    };
    const pctDone = stats.total
      ? Math.round((stats.done / stats.total) * 100)
      : 0;
    return {
      code: p.code,
      name: p.name,
      status: p.status,
      statusLabel: statusLabels[p.status] || p.status,
      owner: p.ownerEmail,
      due: fmtDate(p.dueAt),
      tasks: stats.total,
      pctDone,
    };
  }),
);

const taskTableRows = computed(() =>
  tasks.value.map((t) => ({
    title: t.title,
    status: t.status,
    statusLabel: statusLabels[t.status] || t.status,
    priority: priorityLabels[t.priority] || "—",
    assignee: t.assigneeEmail || "—",
    due: fmtDate(t.dueAt),
  })),
);
</script>

<template>
  <div class="reports">
    <!-- Header with back button -->
    <header class="reports__header">
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
    </header>

    <!-- KPI row -->
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
        <span class="kpi-card__value">{{
          projectStatusCounts["active"] || 0
        }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Tarefas Bloqueadas</span>
        <span class="kpi-card__value kpi-card__value--danger">{{
          blockedTasks
        }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Tarefas Atrasadas</span>
        <span class="kpi-card__value kpi-card__value--danger">{{
          overdueTasks
        }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Vencem esta Semana</span>
        <span class="kpi-card__value kpi-card__value--warn">{{
          dueThisWeek
        }}</span>
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

    <!-- Charts row -->
    <section class="reports__charts">
      <!-- Project Status Donut -->
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
              v-for="(arc, i) in projectArcs"
              :key="i"
              :d="arc.d"
              fill="none"
              :stroke="arc.color"
              stroke-width="18"
              stroke-linecap="round"
            >
              <title>{{ arc.label }}: {{ arc.pct }}%</title>
            </path>
            <text
              x="90"
              y="86"
              text-anchor="middle"
              class="donut-chart__center-value"
            >
              {{ projects.length }}
            </text>
            <text
              x="90"
              y="102"
              text-anchor="middle"
              class="donut-chart__center-label"
            >
              projetos
            </text>
          </svg>
          <ul class="chart-legend">
            <li
              v-for="arc in projectArcs"
              :key="arc.label"
              class="chart-legend__item"
            >
              <span
                class="chart-legend__dot"
                :style="{ background: arc.color }"
              ></span>
              <span class="chart-legend__label">{{ arc.label }}</span>
              <span class="chart-legend__value">{{ arc.pct }}%</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Task Status Donut -->
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
              v-for="(arc, i) in taskArcs"
              :key="i"
              :d="arc.d"
              fill="none"
              :stroke="arc.color"
              stroke-width="18"
              stroke-linecap="round"
            >
              <title>{{ arc.label }}: {{ arc.pct }}%</title>
            </path>
            <text
              x="90"
              y="86"
              text-anchor="middle"
              class="donut-chart__center-value"
            >
              {{ tasks.length }}
            </text>
            <text
              x="90"
              y="102"
              text-anchor="middle"
              class="donut-chart__center-label"
            >
              tarefas
            </text>
          </svg>
          <ul class="chart-legend">
            <li
              v-for="arc in taskArcs"
              :key="arc.label"
              class="chart-legend__item"
            >
              <span
                class="chart-legend__dot"
                :style="{ background: arc.color }"
              ></span>
              <span class="chart-legend__label">{{ arc.label }}</span>
              <span class="chart-legend__value">{{ arc.pct }}%</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Task Priority Bar Chart -->
      <div class="chart-card card">
        <h3 class="chart-card__title">Tarefas por Prioridade</h3>
        <div class="bar-chart">
          <div
            v-for="bar in priorityBars"
            :key="bar.label"
            class="bar-chart__row"
          >
            <span class="bar-chart__label">{{ bar.label }}</span>
            <div class="bar-chart__track">
              <div
                class="bar-chart__fill"
                :style="{ width: bar.pct + '%', background: bar.color }"
              ></div>
            </div>
            <span class="bar-chart__count">{{ bar.count }}</span>
          </div>
          <p v-if="!priorityBars.length" class="bar-chart__empty">
            Sem dados de tarefas
          </p>
        </div>
      </div>

      <!-- Assignee Workload Bar Chart -->
      <div class="chart-card card">
        <h3 class="chart-card__title">Carga por Responsável</h3>
        <div class="bar-chart">
          <div
            v-for="bar in workloadBars"
            :key="bar.label"
            class="bar-chart__row"
          >
            <span class="bar-chart__label bar-chart__label--wide">{{
              bar.label
            }}</span>
            <div class="bar-chart__track">
              <div
                class="bar-chart__fill"
                :style="{ width: bar.pct + '%', background: bar.color }"
              ></div>
            </div>
            <span class="bar-chart__count">{{ bar.count }}</span>
          </div>
          <p v-if="!workloadBars.length" class="bar-chart__empty">
            Nenhum responsável atribuído
          </p>
        </div>
      </div>
    </section>

    <!-- Data Tables -->
    <section class="reports__tables">
      <div class="table-section card">
        <h3 class="chart-card__title">Projetos</h3>
        <div class="table-section__wrap">
          <table class="data-table" v-if="projectTableRows.length">
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
              <tr v-for="p in projectTableRows" :key="p.code">
                <td class="td-strong">{{ p.code }}</td>
                <td>{{ p.name }}</td>
                <td>
                  <span class="badge" :class="'badge--' + p.status">{{
                    p.statusLabel
                  }}</span>
                </td>
                <td class="td-muted">{{ p.owner }}</td>
                <td class="td-muted">{{ p.due }}</td>
                <td class="td-muted">{{ p.tasks }}</td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-cell__track">
                      <div
                        class="progress-cell__fill"
                        :style="{ width: p.pctDone + '%' }"
                      ></div>
                    </div>
                    <span class="progress-cell__text">{{ p.pctDone }}%</span>
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
          <table class="data-table" v-if="taskTableRows.length">
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
              <tr v-for="t in taskTableRows" :key="t.title">
                <td class="td-strong">{{ t.title }}</td>
                <td>
                  <span class="badge" :class="'badge--' + t.status">{{
                    t.statusLabel
                  }}</span>
                </td>
                <td>{{ t.priority }}</td>
                <td class="td-muted">{{ t.assignee }}</td>
                <td class="td-muted">{{ t.due }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="table-section__empty">Nenhuma tarefa.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.reports {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: var(--content-max-width, 1280px);
  width: 100%;
  box-sizing: border-box;
  margin-inline: auto;
  padding-inline: clamp(1rem, 3vw, 2.5rem);
}

.reports__header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.reports__back {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.reports__back-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.reports__title {
  margin: 0;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -0.02em;
}

.reports__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
}

/* KPIs */
.reports__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.375rem;
  padding: 1.125rem 1.25rem;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  min-height: 5.5rem;
}

.kpi-card__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.3;
}

.kpi-card__value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-1);
  line-height: 1.1;
  text-align: center;
}

/* Charts Grid */
.reports__charts {
  display: grid;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2rem;
  }

  @media (min-width: 640px) and (max-width: 1023px) {
    grid-template-columns: 1fr 1fr;
  }
}

.chart-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-1);
}

.chart-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Donut Chart */
.donut-chart {
  width: 160px;
  height: 160px;
}

.donut-chart__center-value {
  font-size: 1.5rem;
  font-weight: 800;
  fill: var(--text-1);
}

.donut-chart__center-label {
  font-size: 0.625rem;
  font-weight: 600;
  fill: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Legend */
.chart-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  justify-content: center;
}

.chart-legend__item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.chart-legend__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-legend__label {
  color: var(--text-2);
  text-transform: capitalize;
}

.chart-legend__value {
  font-weight: 700;
  color: var(--text-1);
}

/* Bar Chart */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
}

.bar-chart__row {
  display: grid;
  grid-template-columns: 5.5rem 1fr 2.5rem;
  align-items: center;
  gap: 1rem;
}

.bar-chart__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-2);
  text-align: right;
}

.bar-chart__track {
  height: 1.25rem;
  background: var(--surface-2);
  border-radius: 6px;
  overflow: hidden;
}

.bar-chart__fill {
  height: 100%;
  border-radius: 6px;
  transition: width 500ms ease;
  min-width: 2px;
}

.bar-chart__count {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-1);
}

.bar-chart__empty {
  text-align: center;
  color: var(--text-muted);
  padding: 1rem;
}

/* Tables */
.reports__tables {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.table-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.table-section__wrap {
  overflow-x: auto;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
}

.table-section__empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

/* Badge overrides for this page */
.badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 600;
}

.badge--planned {
  background: var(--warning-soft);
  color: var(--warning);
}
.badge--active {
  background: var(--success-soft);
  color: var(--success);
}
.badge--blocked {
  background: var(--danger-soft);
  color: var(--danger);
}
.badge--done {
  background: var(--info-soft);
  color: var(--info);
}
.badge--archived {
  background: var(--surface-3);
  color: var(--text-muted);
}
.badge--todo {
  background: var(--surface-3);
  color: var(--text-2);
}
.badge--doing {
  background: var(--info-soft);
  color: var(--info);
}

/* Progress cell */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-cell__track {
  flex: 1;
  height: 0.5rem;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
  min-width: 60px;
}

.progress-cell__fill {
  height: 100%;
  background: var(--accent, #6366f1);
  border-radius: 4px;
  transition: width 400ms ease;
}

.progress-cell__text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-1);
  min-width: 2.5rem;
  text-align: right;
}

/* KPI value variants */
.kpi-card__value--danger {
  color: var(--danger, #ef4444);
}

.kpi-card__value--warn {
  color: var(--warning, #f59e0b);
}

/* Wider label for workload chart */
.bar-chart__label--wide {
  min-width: 10rem;
  width: 10rem;
  text-align: right;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0.25rem;
}
</style>
