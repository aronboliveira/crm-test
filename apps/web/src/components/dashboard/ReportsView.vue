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

const priorityColors: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#16a34a",
  5: "#94a3b8",
};

const priorityLabels: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

/* ---- Donut arcs ---- */
type Slice = { label: string; value: number; color: string; pct: number };

function makeSlices(
  map: Record<string, number>,
  colors: Record<string, string>,
): Slice[] {
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: k,
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
  buildArcs(makeSlices(projectStatusCounts.value, statusColors)),
);
const taskArcs = computed(() =>
  buildArcs(makeSlices(taskStatusCounts.value, statusColors)),
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

/* ---- Summary table data ---- */
const projectTableRows = computed(() =>
  projects.value.map((p) => ({
    code: p.code,
    name: p.name,
    status: p.status,
    owner: p.ownerEmail,
    due: p.dueAt
      ? new Date(p.dueAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
  })),
);

const taskTableRows = computed(() =>
  tasks.value.map((t) => ({
    title: t.title,
    status: t.status,
    priority: priorityLabels[t.priority] || "—",
    assignee: t.assigneeEmail,
    due: t.dueAt
      ? new Date(t.dueAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
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
        title="Back to dashboard"
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
        Back
      </button>
      <div>
        <h1 class="reports__title">Reports &amp; Analytics</h1>
        <p class="reports__subtitle">
          Overview of your project and task management metrics.
        </p>
      </div>
    </header>

    <!-- KPI row -->
    <section class="reports__kpis">
      <div class="kpi-card">
        <span class="kpi-card__label">Total Projects</span>
        <span class="kpi-card__value">{{ projects.length }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Total Tasks</span>
        <span class="kpi-card__value">{{ tasks.length }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Completion Rate</span>
        <span class="kpi-card__value">{{ completionRate }}%</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Active Projects</span>
        <span class="kpi-card__value">{{
          projectStatusCounts["active"] || 0
        }}</span>
      </div>
    </section>

    <!-- Charts row -->
    <section class="reports__charts">
      <!-- Project Status Donut -->
      <div class="chart-card card">
        <h3 class="chart-card__title">Project Status</h3>
        <div class="chart-card__body">
          <svg
            viewBox="0 0 180 180"
            class="donut-chart"
            role="img"
            aria-label="Project status distribution"
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
              projects
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
        <h3 class="chart-card__title">Task Status</h3>
        <div class="chart-card__body">
          <svg
            viewBox="0 0 180 180"
            class="donut-chart"
            role="img"
            aria-label="Task status distribution"
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
              tasks
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
        <h3 class="chart-card__title">Tasks by Priority</h3>
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
            No task data
          </p>
        </div>
      </div>
    </section>

    <!-- Data Tables -->
    <section class="reports__tables">
      <div class="table-section card">
        <h3 class="chart-card__title">Projects</h3>
        <div class="table-section__wrap">
          <table class="data-table" v-if="projectTableRows.length">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in projectTableRows" :key="p.code">
                <td class="td-strong">{{ p.code }}</td>
                <td>{{ p.name }}</td>
                <td>
                  <span class="badge" :class="'badge--' + p.status">{{
                    p.status
                  }}</span>
                </td>
                <td class="td-muted">{{ p.owner }}</td>
                <td class="td-muted">{{ p.due }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="table-section__empty">No projects.</p>
        </div>
      </div>

      <div class="table-section card">
        <h3 class="chart-card__title">Tasks</h3>
        <div class="table-section__wrap">
          <table class="data-table" v-if="taskTableRows.length">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in taskTableRows" :key="t.title">
                <td class="td-strong">{{ t.title }}</td>
                <td>
                  <span class="badge" :class="'badge--' + t.status">{{
                    t.status
                  }}</span>
                </td>
                <td>{{ t.priority }}</td>
                <td class="td-muted">{{ t.assignee }}</td>
                <td class="td-muted">{{ t.due }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="table-section__empty">No tasks.</p>
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
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
}

.kpi-card__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.kpi-card__value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-1);
  line-height: 1.1;
}

/* Charts Grid */
.reports__charts {
  display: grid;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
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
  gap: 0.75rem;
  width: 100%;
}

.bar-chart__row {
  display: grid;
  grid-template-columns: 5rem 1fr 2.5rem;
  align-items: center;
  gap: 0.75rem;
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
</style>
