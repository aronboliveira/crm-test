<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDashboardHome } from "../../assets/scripts/dashboard/useDashboardHome";
import ModalService from "../../services/ModalService";
import ApiClientService from "../../services/ApiClientService";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { TaskRow } from "../../pinia/types/tasks.types";
import DashboardSummaryCards from "./DashboardSummaryCards.vue";
import RecentProjects from "./RecentProjects.vue";
import RecentTasks from "./RecentTasks.vue";
import ActivityFeed from "./ActivityFeed.vue";
import QuickActions from "./QuickActions.vue";
import BarChart from "../charts/BarChart.vue";
import StatCard from "../charts/StatCard.vue";

// Lazy-load modal components
const ProjectFormModal = defineAsyncComponent(
  () => import("../forms/ProjectFormModal.vue"),
);
const TaskFormModal = defineAsyncComponent(
  () => import("../forms/TaskFormModal.vue"),
);
const ProjectsTableModal = defineAsyncComponent(
  () => import("./ProjectsTableModal.vue"),
);
const TasksTableModal = defineAsyncComponent(
  () => import("./TasksTableModal.vue"),
);
const InviteUserModal = defineAsyncComponent(
  () => import("./InviteUserModal.vue"),
);

type GrowthMetric = "projects" | "tasks" | "clients";
type GrowthWindow = 3 | 6 | 12;
type GrowthTrendDirection = "up" | "down" | "neutral";
type GrowthBucket = Readonly<{ key: string; label: string }>;
type GrowthMetricData = Readonly<{
  counts: readonly number[];
  totalInWindow: number;
  currentMonth: number;
  previousMonth: number;
  momRatePct: number;
  trend: GrowthTrendDirection;
}>;
type GrowthInsight = Readonly<{
  trend: GrowthTrendDirection;
  trendValue: string;
  currentMonthValue: number;
  totalInWindow: number;
}>;

const DEFAULT_GROWTH_WINDOW: GrowthWindow = 6;
const GROWTH_WINDOW_OPTIONS: readonly GrowthWindow[] = [3, 6, 12];
const DEFAULT_GROWTH_METRICS: readonly GrowthMetric[] = [
  "projects",
  "tasks",
  "clients",
];
const GROWTH_QUERY_WINDOW_KEY = "gwd";
const GROWTH_QUERY_METRICS_KEY = "gmt";
const GROWTH_QUERY_OWNER_KEY = "gow";
const GROWTH_QUERY_STATUS_KEY = "gst";
const LEGACY_GROWTH_QUERY_WINDOW_KEY = "growthWindow";
const LEGACY_GROWTH_QUERY_METRICS_KEY = "growthMetrics";
const LEGACY_GROWTH_QUERY_OWNER_KEY = "growthOwner";
const LEGACY_GROWTH_QUERY_STATUS_KEY = "growthStatus";

const GROWTH_METRIC_LABELS: Readonly<Record<GrowthMetric, string>> =
  Object.freeze({
    projects: "Projetos",
    tasks: "Tarefas",
    clients: "Clientes",
  });

const GROWTH_METRIC_COLORS: Readonly<Record<GrowthMetric, string>> =
  Object.freeze({
    projects: "#3b82f6",
    tasks: "#22c55e",
    clients: "#f59e0b",
  });

const router = useRouter();
const route = useRoute();
const { stats, projects, tasks, clients, busy, load } = useDashboardHome();
const growthWindow = ref<GrowthWindow>(DEFAULT_GROWTH_WINDOW);
const growthMetrics = ref<GrowthMetric[]>([...DEFAULT_GROWTH_METRICS]);
const growthBusy = ref(false);
const growthApiError = ref<string | null>(null);
const growthApiBuckets = ref<GrowthBucket[] | null>(null);
const growthApiMetrics = ref<Partial<Record<GrowthMetric, GrowthMetricData>>>(
  {},
);
const growthUnavailableMetrics = ref<GrowthMetric[]>([]);
const growthRequestVersion = ref(0);
const growthOwnerFilter = ref("");
const growthStatusFilters = ref<string[]>([]);
const growthAllowFallback = ref(false);

const isDashboardHomeRoute = (): boolean =>
  route.path === "/dashboard" || route.path === "/dashboard/";

// Computed stats with extended data
const activeProjects = computed(
  () => projects.value.filter((p) => p.status === "active").length,
);

const completedTasks = computed(
  () => tasks.value.filter((t) => t.status === "done").length,
);

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toQueryString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }
  return typeof value === "string" ? value.trim() : "";
};

const hasQueryKey = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(route.query, key);

const resolveQueryValue = (key: string, legacyKey: string): unknown => {
  const currentValue = route.query[key];
  if (toQueryString(currentValue)) {
    return currentValue;
  }
  return route.query[legacyKey];
};

const hasAnyGrowthQueryParams = (): boolean =>
  [
    GROWTH_QUERY_WINDOW_KEY,
    GROWTH_QUERY_METRICS_KEY,
    GROWTH_QUERY_OWNER_KEY,
    GROWTH_QUERY_STATUS_KEY,
    LEGACY_GROWTH_QUERY_WINDOW_KEY,
    LEGACY_GROWTH_QUERY_METRICS_KEY,
    LEGACY_GROWTH_QUERY_OWNER_KEY,
    LEGACY_GROWTH_QUERY_STATUS_KEY,
  ].some(hasQueryKey);

const hasLegacyGrowthQueryParams = (): boolean =>
  [
    LEGACY_GROWTH_QUERY_WINDOW_KEY,
    LEGACY_GROWTH_QUERY_METRICS_KEY,
    LEGACY_GROWTH_QUERY_OWNER_KEY,
    LEGACY_GROWTH_QUERY_STATUS_KEY,
  ].some(hasQueryKey);

const isGrowthTrend = (value: unknown): value is GrowthTrendDirection =>
  value === "up" || value === "down" || value === "neutral";

const normalizeGrowthWindow = (raw: unknown): GrowthWindow => {
  const parsed =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.trunc(raw)
      : Number.parseInt(toQueryString(raw), 10);
  if (parsed === 3 || parsed === 6 || parsed === 12) {
    return parsed;
  }
  return DEFAULT_GROWTH_WINDOW;
};

const toGrowthMetric = (value: string): GrowthMetric | null => {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "projects" ||
    normalized === "tasks" ||
    normalized === "clients"
  ) {
    return normalized;
  }
  return null;
};

const normalizeGrowthMetricsOrder = (
  metrics: readonly GrowthMetric[],
): GrowthMetric[] => {
  const selected = new Set(metrics);
  const ordered = DEFAULT_GROWTH_METRICS.filter((metric) =>
    selected.has(metric),
  );
  return ordered.length ? ordered : [...DEFAULT_GROWTH_METRICS];
};

const parseGrowthMetrics = (raw: unknown): GrowthMetric[] => {
  const asText = toQueryString(raw);
  if (!asText) {
    return [...DEFAULT_GROWTH_METRICS];
  }

  const seen = new Set<GrowthMetric>();
  const parsed: GrowthMetric[] = [];
  for (const token of asText.split(",")) {
    const metric = toGrowthMetric(token);
    if (!metric || seen.has(metric)) {
      continue;
    }
    seen.add(metric);
    parsed.push(metric);
  }
  return normalizeGrowthMetricsOrder(parsed);
};

const parseGrowthMetricsFromList = (raw: unknown): GrowthMetric[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<GrowthMetric>();
  const metrics: GrowthMetric[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }
    const metric = toGrowthMetric(entry);
    if (!metric || seen.has(metric)) {
      continue;
    }
    seen.add(metric);
    metrics.push(metric);
  }
  return metrics;
};

const normalizeGrowthOwner = (raw: unknown): string => toQueryString(raw);

const parseGrowthStatusFilters = (raw: unknown): string[] => {
  const normalized = toQueryString(raw);
  if (!normalized) {
    return [];
  }

  const seen = new Set<string>();
  const statuses: string[] = [];
  for (const token of normalized.split(",")) {
    const value = token.trim().toLowerCase();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    statuses.push(value);
  }
  return statuses;
};

const serializeGrowthMetrics = (metrics: readonly GrowthMetric[]): string =>
  normalizeGrowthMetricsOrder(metrics).join(",");

const serializeGrowthStatusFilters = (statuses: readonly string[]): string =>
  statuses
    .map((status) =>
      String(status || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(",");

const areGrowthMetricsEqual = (
  left: readonly GrowthMetric[],
  right: readonly GrowthMetric[],
): boolean => serializeGrowthMetrics(left) === serializeGrowthMetrics(right);

const areGrowthStatusesEqual = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  serializeGrowthStatusFilters(left) === serializeGrowthStatusFilters(right);

const toBucketKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toBucketLabel = (date: Date): string => {
  const base = monthLabelFormatter.format(date).replace(".", "");
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const buildGrowthBuckets = (windowMonths: GrowthWindow): GrowthBucket[] => {
  const now = new Date();
  const buckets: GrowthBucket[] = [];
  for (let offset = windowMonths - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: toBucketKey(monthDate),
      label: toBucketLabel(monthDate),
    });
  }
  return buckets;
};

const normalizeGrowthBuckets = (
  rawBuckets: unknown,
  fallbackWindow: GrowthWindow,
): GrowthBucket[] => {
  if (!Array.isArray(rawBuckets)) {
    return buildGrowthBuckets(fallbackWindow);
  }
  const normalized = rawBuckets
    .map((entry): GrowthBucket | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const key = typeof row.key === "string" ? row.key.trim() : "";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      if (!key || !label) {
        return null;
      }
      return { key, label };
    })
    .filter((entry): entry is GrowthBucket => !!entry);

  return normalized.length ? normalized : buildGrowthBuckets(fallbackWindow);
};

const buildGrowthPayloadFromCounts = (
  counts: readonly number[],
): GrowthMetricData => {
  const currentMonth = counts[counts.length - 1] ?? 0;
  const previousMonth = counts[counts.length - 2] ?? 0;
  const totalInWindow = counts.reduce((sum, value) => sum + value, 0);

  const rawRate =
    previousMonth === 0
      ? currentMonth === 0
        ? 0
        : 100
      : ((currentMonth - previousMonth) / previousMonth) * 100;
  const momRatePct = Number.isFinite(rawRate) ? Number(rawRate.toFixed(1)) : 0;
  const trend: GrowthTrendDirection =
    momRatePct > 2 ? "up" : momRatePct < -2 ? "down" : "neutral";

  return {
    counts: [...counts],
    totalInWindow,
    currentMonth,
    previousMonth,
    momRatePct,
    trend,
  };
};

const buildEmptyGrowthPayload = (bucketCount: number): GrowthMetricData =>
  buildGrowthPayloadFromCounts(new Array<number>(bucketCount).fill(0));

const buildTrendValue = (payload: GrowthMetricData): string => {
  if (payload.previousMonth === 0) {
    if (payload.currentMonth === 0) {
      return "0% m/m";
    }
    return `+${payload.currentMonth} novos`;
  }
  return `${payload.momRatePct > 0 ? "+" : ""}${payload.momRatePct}% m/m`;
};

const normalizeApiGrowthMetricPayload = (
  rawPayload: unknown,
  bucketCount: number,
): GrowthMetricData | null => {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  const row = rawPayload as Record<string, unknown>;
  const rawCounts = Array.isArray(row.counts) ? row.counts : [];
  const counts = new Array<number>(bucketCount)
    .fill(0)
    .map((_, index) => toFiniteNumber(rawCounts[index], 0));
  const fallbackPayload = buildGrowthPayloadFromCounts(counts);

  const trendValue = isGrowthTrend(row.trend)
    ? row.trend
    : fallbackPayload.trend;
  const totalInWindow = toFiniteNumber(
    row.totalInWindow,
    fallbackPayload.totalInWindow,
  );
  const currentMonth = toFiniteNumber(
    row.currentMonth,
    fallbackPayload.currentMonth,
  );
  const previousMonth = toFiniteNumber(
    row.previousMonth,
    fallbackPayload.previousMonth,
  );
  const momRatePct = toFiniteNumber(row.momRatePct, fallbackPayload.momRatePct);

  return {
    counts,
    totalInWindow,
    currentMonth,
    previousMonth,
    momRatePct,
    trend: trendValue,
  };
};

const normalizeGrowthApiResponse = (
  payload: unknown,
  fallbackWindow: GrowthWindow,
): {
  buckets: GrowthBucket[];
  metrics: Partial<Record<GrowthMetric, GrowthMetricData>>;
  unavailableMetrics: GrowthMetric[];
} => {
  const source = payload && typeof payload === "object" ? payload : {};
  const row = source as Record<string, unknown>;

  const windowMonths = normalizeGrowthWindow(row.windowMonths);
  const buckets = normalizeGrowthBuckets(
    row.buckets,
    windowMonths || fallbackWindow,
  );
  const bucketCount = buckets.length || fallbackWindow;

  const rawMetrics =
    row.metrics && typeof row.metrics === "object"
      ? (row.metrics as Record<string, unknown>)
      : {};
  const metrics: Partial<Record<GrowthMetric, GrowthMetricData>> = {};

  for (const metric of DEFAULT_GROWTH_METRICS) {
    const metricPayload = normalizeApiGrowthMetricPayload(
      rawMetrics[metric],
      bucketCount,
    );
    if (metricPayload) {
      metrics[metric] = metricPayload;
    }
  }

  return {
    buckets,
    metrics,
    unavailableMetrics: parseGrowthMetricsFromList(row.unavailableMetrics),
  };
};

const growthBuckets = computed<GrowthBucket[]>(() => {
  if (growthApiBuckets.value?.length) {
    return growthApiBuckets.value;
  }
  return buildGrowthBuckets(growthWindow.value);
});

const toValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildMonthlyCounts = (
  rows: readonly Readonly<{ createdAt?: string | null }>[],
  buckets: readonly GrowthBucket[],
): number[] => {
  const counts = new Array<number>(buckets.length).fill(0);
  const indexByKey = new Map<string, number>();
  buckets.forEach((bucket, index) => {
    indexByKey.set(bucket.key, index);
  });

  for (const row of rows) {
    const createdAt = toValidDate(
      typeof row.createdAt === "string" ? row.createdAt : null,
    );
    if (!createdAt) continue;
    const idx = indexByKey.get(toBucketKey(createdAt));
    if (idx === undefined) continue;
    counts[idx] = (counts[idx] ?? 0) + 1;
  }

  return counts;
};

const buildGrowthInsight = (payload: GrowthMetricData): GrowthInsight => {
  return {
    trend: payload.trend,
    trendValue: buildTrendValue(payload),
    currentMonthValue: payload.currentMonth,
    totalInWindow: payload.totalInWindow,
  };
};

const buildFallbackMetric = (
  metric: GrowthMetric,
  buckets: readonly GrowthBucket[],
): GrowthMetricData => {
  if (metric === "projects") {
    return buildGrowthPayloadFromCounts(
      buildMonthlyCounts(projects.value, buckets),
    );
  }
  if (metric === "tasks") {
    return buildGrowthPayloadFromCounts(
      buildMonthlyCounts(tasks.value, buckets),
    );
  }
  return buildGrowthPayloadFromCounts(
    buildMonthlyCounts(clients.value, buckets),
  );
};

const resolvedGrowthByMetric = computed<Record<GrowthMetric, GrowthMetricData>>(
  () => {
    const buckets = growthBuckets.value;
    const resolved = {} as Record<GrowthMetric, GrowthMetricData>;
    for (const metric of DEFAULT_GROWTH_METRICS) {
      const apiData = growthApiMetrics.value[metric];
      if (apiData) {
        resolved[metric] = apiData;
        continue;
      }
      resolved[metric] = growthAllowFallback.value
        ? buildFallbackMetric(metric, buckets)
        : buildEmptyGrowthPayload(buckets.length);
    }
    return resolved;
  },
);

const visibleGrowthMetrics = computed<GrowthMetric[]>(() => {
  const selected = normalizeGrowthMetricsOrder(growthMetrics.value);
  if (!growthUnavailableMetrics.value.length) {
    return selected;
  }
  const unavailableSet = new Set(growthUnavailableMetrics.value);
  return selected.filter((metric) => !unavailableSet.has(metric));
});

const growthUnavailableLabel = computed(() =>
  growthUnavailableMetrics.value
    .map((metric) => GROWTH_METRIC_LABELS[metric])
    .join(", "),
);

const growthWindowMonths = computed(() => growthBuckets.value.length);

const metricIsVisible = (metric: GrowthMetric): boolean =>
  visibleGrowthMetrics.value.includes(metric);

const metricIsSelected = (metric: GrowthMetric): boolean =>
  growthMetrics.value.includes(metric);

const projectGrowthInsight = computed(() =>
  buildGrowthInsight(resolvedGrowthByMetric.value.projects),
);

const taskGrowthInsight = computed(() =>
  buildGrowthInsight(resolvedGrowthByMetric.value.tasks),
);

const clientGrowthInsight = computed(() =>
  buildGrowthInsight(resolvedGrowthByMetric.value.clients),
);

const buildGrowthBars = (metric: GrowthMetric) =>
  growthBuckets.value.map((bucket, index) => ({
    label: bucket.label,
    value: resolvedGrowthByMetric.value[metric].counts[index] ?? 0,
    color: GROWTH_METRIC_COLORS[metric],
  }));

const projectGrowthBars = computed(() => buildGrowthBars("projects"));
const taskGrowthBars = computed(() => buildGrowthBars("tasks"));
const clientGrowthBars = computed(() => buildGrowthBars("clients"));

const loadGrowth = async (): Promise<void> => {
  const requestId = growthRequestVersion.value + 1;
  growthRequestVersion.value = requestId;
  growthBusy.value = true;
  growthApiError.value = null;
  growthAllowFallback.value = false;

  try {
    const response = await ApiClientService.dashboard.growth({
      window: growthWindow.value,
      metrics: growthMetrics.value,
      owner: growthOwnerFilter.value || undefined,
      statuses: growthStatusFilters.value,
    });

    if (requestId !== growthRequestVersion.value) {
      return;
    }

    const normalized = normalizeGrowthApiResponse(response, growthWindow.value);
    growthApiBuckets.value = normalized.buckets;
    growthApiMetrics.value = normalized.metrics;
    growthUnavailableMetrics.value = normalized.unavailableMetrics;
  } catch (error) {
    if (requestId !== growthRequestVersion.value) {
      return;
    }

    console.error("[DashboardHome] Failed to load growth metrics:", error);
    growthApiError.value =
      "Dados agregados indisponíveis. Exibindo contagens locais.";
    growthApiBuckets.value = null;
    growthApiMetrics.value = {};
    growthUnavailableMetrics.value = [];
    growthAllowFallback.value = true;
  } finally {
    if (requestId === growthRequestVersion.value) {
      growthBusy.value = false;
    }
  }
};

const syncGrowthStateFromRoute = async (): Promise<void> => {
  if (!isDashboardHomeRoute()) {
    return;
  }

  const nextWindow = normalizeGrowthWindow(
    resolveQueryValue(GROWTH_QUERY_WINDOW_KEY, LEGACY_GROWTH_QUERY_WINDOW_KEY),
  );
  const nextMetrics = parseGrowthMetrics(
    resolveQueryValue(
      GROWTH_QUERY_METRICS_KEY,
      LEGACY_GROWTH_QUERY_METRICS_KEY,
    ),
  );
  const nextOwner = normalizeGrowthOwner(
    resolveQueryValue(GROWTH_QUERY_OWNER_KEY, LEGACY_GROWTH_QUERY_OWNER_KEY),
  );
  const nextStatuses = parseGrowthStatusFilters(
    resolveQueryValue(GROWTH_QUERY_STATUS_KEY, LEGACY_GROWTH_QUERY_STATUS_KEY),
  );

  const currentQueryWindow = toQueryString(
    route.query[GROWTH_QUERY_WINDOW_KEY],
  );
  const currentQueryMetrics = toQueryString(
    route.query[GROWTH_QUERY_METRICS_KEY],
  );
  const currentQueryOwner = toQueryString(route.query[GROWTH_QUERY_OWNER_KEY]);
  const currentQueryStatus = toQueryString(
    route.query[GROWTH_QUERY_STATUS_KEY],
  );
  const normalizedQueryWindow = String(nextWindow);
  const normalizedQueryMetrics = serializeGrowthMetrics(nextMetrics);
  const normalizedQueryOwner = nextOwner;
  const normalizedQueryStatus = serializeGrowthStatusFilters(nextStatuses);

  if (growthWindow.value !== nextWindow) {
    growthWindow.value = nextWindow;
  }
  if (!areGrowthMetricsEqual(growthMetrics.value, nextMetrics)) {
    growthMetrics.value = nextMetrics;
  }
  if (growthOwnerFilter.value !== nextOwner) {
    growthOwnerFilter.value = nextOwner;
  }
  if (!areGrowthStatusesEqual(growthStatusFilters.value, nextStatuses)) {
    growthStatusFilters.value = nextStatuses;
  }

  if (!hasAnyGrowthQueryParams()) {
    await loadGrowth();
    return;
  }

  if (
    currentQueryWindow !== normalizedQueryWindow ||
    currentQueryMetrics !== normalizedQueryMetrics ||
    currentQueryOwner !== normalizedQueryOwner ||
    currentQueryStatus !== normalizedQueryStatus ||
    hasLegacyGrowthQueryParams()
  ) {
    await router.replace({
      query: {
        ...route.query,
        [GROWTH_QUERY_WINDOW_KEY]: normalizedQueryWindow,
        [GROWTH_QUERY_METRICS_KEY]: normalizedQueryMetrics,
        [GROWTH_QUERY_OWNER_KEY]: normalizedQueryOwner || undefined,
        [GROWTH_QUERY_STATUS_KEY]: normalizedQueryStatus || undefined,
        [LEGACY_GROWTH_QUERY_WINDOW_KEY]: undefined,
        [LEGACY_GROWTH_QUERY_METRICS_KEY]: undefined,
        [LEGACY_GROWTH_QUERY_OWNER_KEY]: undefined,
        [LEGACY_GROWTH_QUERY_STATUS_KEY]: undefined,
      },
    });
    return;
  }

  await loadGrowth();
};

watch(
  () => [
    route.query[GROWTH_QUERY_WINDOW_KEY],
    route.query[GROWTH_QUERY_METRICS_KEY],
    route.query[GROWTH_QUERY_OWNER_KEY],
    route.query[GROWTH_QUERY_STATUS_KEY],
    route.query[LEGACY_GROWTH_QUERY_WINDOW_KEY],
    route.query[LEGACY_GROWTH_QUERY_METRICS_KEY],
    route.query[LEGACY_GROWTH_QUERY_OWNER_KEY],
    route.query[LEGACY_GROWTH_QUERY_STATUS_KEY],
  ],
  () => {
    void syncGrowthStateFromRoute();
  },
);

onMounted(() => {
  void syncGrowthStateFromRoute();
});

const pushGrowthStateToRoute = async (): Promise<void> => {
  if (!isDashboardHomeRoute()) {
    return;
  }

  const nextWindow = String(growthWindow.value);
  const nextMetrics = serializeGrowthMetrics(growthMetrics.value);
  const nextOwner = growthOwnerFilter.value.trim();
  const nextStatus = serializeGrowthStatusFilters(growthStatusFilters.value);

  if (
    toQueryString(route.query[GROWTH_QUERY_WINDOW_KEY]) === nextWindow &&
    toQueryString(route.query[GROWTH_QUERY_METRICS_KEY]) === nextMetrics &&
    toQueryString(route.query[GROWTH_QUERY_OWNER_KEY]) === nextOwner &&
    toQueryString(route.query[GROWTH_QUERY_STATUS_KEY]) === nextStatus &&
    !hasLegacyGrowthQueryParams()
  ) {
    await loadGrowth();
    return;
  }

  await router.replace({
    query: {
      ...route.query,
      [GROWTH_QUERY_WINDOW_KEY]: nextWindow,
      [GROWTH_QUERY_METRICS_KEY]: nextMetrics,
      [GROWTH_QUERY_OWNER_KEY]: nextOwner || undefined,
      [GROWTH_QUERY_STATUS_KEY]: nextStatus || undefined,
      [LEGACY_GROWTH_QUERY_WINDOW_KEY]: undefined,
      [LEGACY_GROWTH_QUERY_METRICS_KEY]: undefined,
      [LEGACY_GROWTH_QUERY_OWNER_KEY]: undefined,
      [LEGACY_GROWTH_QUERY_STATUS_KEY]: undefined,
    },
  });
};

const setGrowthWindow = (windowOption: GrowthWindow): void => {
  if (growthWindow.value === windowOption) {
    return;
  }
  growthWindow.value = windowOption;
  void pushGrowthStateToRoute();
};

const toggleGrowthMetric = (metric: GrowthMetric): void => {
  const selected = new Set(growthMetrics.value);
  if (selected.has(metric)) {
    if (selected.size === 1) {
      return;
    }
    selected.delete(metric);
  } else {
    selected.add(metric);
  }

  growthMetrics.value = normalizeGrowthMetricsOrder([...selected]);
  void pushGrowthStateToRoute();
};

const reloadDashboard = async (): Promise<void> => {
  await Promise.all([load(), loadGrowth()]);
};

// Navigation handlers
const goToProjects = () => router.push("/dashboard/projects");
const goToTasks = () => router.push("/dashboard/tasks");

// Open project details modal
const viewProject = async (project: ProjectRow) => {
  const result = await ModalService.open(ProjectFormModal, {
    title: `Editar Projeto: ${project.name}`,
    size: "md",
    data: { project },
  });
  if (result) {
    await reloadDashboard();
  }
};

// Open task details modal
const viewTask = async (task: TaskRow) => {
  const result = await ModalService.open(TaskFormModal, {
    title: `Editar Tarefa: ${task.title}`,
    size: "md",
    data: { task },
  });
  if (result) {
    await reloadDashboard();
  }
};

// Quick action handlers
const handleQuickAction = async (action: string) => {
  switch (action) {
    case "new-project": {
      const result = await ModalService.open(ProjectFormModal, {
        title: "Criar Novo Projeto",
        size: "md",
      });
      if (result) {
        await reloadDashboard();
      }
      break;
    }
    case "new-task": {
      const result = await ModalService.open(TaskFormModal, {
        title: "Criar Nova Tarefa",
        size: "md",
      });
      if (result) {
        await reloadDashboard();
      }
      break;
    }
    case "invite-user": {
      await ModalService.open(InviteUserModal, {
        title: "Convidar Usuário",
        size: "sm",
      });
      break;
    }
    case "view-reports":
      router.push("/dashboard/reports");
      break;
  }
};

// Stat card click handlers
const handleStatClick = async (stat: string) => {
  switch (stat) {
    case "total-projects":
      await ModalService.open(ProjectsTableModal, {
        title: "Todos os Projetos",
        size: "xl",
        data: { filter: "all" },
      });
      break;
    case "active-projects":
      await ModalService.open(ProjectsTableModal, {
        title: "Projetos Ativos",
        size: "xl",
        data: { filter: "active" },
      });
      break;
    case "total-tasks":
      await ModalService.open(TasksTableModal, {
        title: "Todas as Tarefas",
        size: "xl",
      });
      break;
    case "completion-rate":
      router.push("/dashboard/reports");
      break;
  }
};
</script>

<template>
  <div class="dashboard-home">
    <!-- Page Header -->
    <header class="dashboard-home__header">
      <div class="dashboard-home__branding">
        <h1 class="dashboard-home__page-title">
          Painel de Gerenciamento de Projetos
        </h1>
        <p class="dashboard-home__page-desc">
          Acompanhe, gerencie e colabore em todos os seus projetos e tarefas em
          um só lugar.
        </p>
      </div>
    </header>

    <!-- Welcome Section -->
    <section class="dashboard-home__welcome">
      <div class="dashboard-home__welcome-text">
        <h2 class="dashboard-home__title">Bem-vindo(a) de volta!</h2>
        <p class="dashboard-home__subtitle">
          Veja o que está acontecendo com seus projetos hoje.
        </p>
      </div>
      <button
        class="btn btn-primary"
        type="button"
        title="Atualizar dados do painel"
        @click="reloadDashboard"
        :disabled="busy || growthBusy"
        :aria-busy="busy || growthBusy"
        style="max-width: 8rem"
      >
        <svg
          v-if="!(busy || growthBusy)"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="btn__icon"
        >
          <polyline points="23,4 23,10 17,10" />
          <polyline points="1,20 1,14 7,14" />
          <path
            d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          />
        </svg>
        <span v-if="busy || growthBusy" class="btn__spinner"></span>
        {{ busy || growthBusy ? "Carregando..." : "Atualizar" }}
      </button>
    </section>

    <!-- Summary Stats Cards -->
    <section class="dashboard-home__section" aria-labelledby="stats-heading">
      <h3 id="stats-heading" class="dashboard-home__section-title">
        Visão Geral
      </h3>
      <DashboardSummaryCards
        :projects="stats.projects"
        :tasks="stats.tasks"
        :active-projects="activeProjects"
        :completed-tasks="completedTasks"
        :loading="busy"
        @stat-click="handleStatClick"
      />
    </section>

    <!-- Growth Intelligence -->
    <section
      class="dashboard-home__section dashboard-home__section--growth"
      aria-labelledby="growth-heading"
    >
      <h3 id="growth-heading" class="dashboard-home__section-title">
        Crescimento Estatístico
      </h3>
      <div class="dashboard-home__growth-toolbar card">
        <div class="dashboard-home__growth-toolbar-group">
          <span class="dashboard-home__growth-toolbar-label">Janela</span>
          <div class="dashboard-home__growth-toolbar-actions" role="group">
            <button
              v-for="windowOption in GROWTH_WINDOW_OPTIONS"
              :key="windowOption"
              type="button"
              class="dashboard-home__growth-chip"
              :class="{
                'dashboard-home__growth-chip--active':
                  growthWindow === windowOption,
              }"
              :aria-pressed="growthWindow === windowOption"
              @click="setGrowthWindow(windowOption)"
            >
              {{ windowOption }} meses
            </button>
          </div>
        </div>
        <div class="dashboard-home__growth-toolbar-group">
          <span class="dashboard-home__growth-toolbar-label">Métricas</span>
          <div class="dashboard-home__growth-toolbar-actions" role="group">
            <button
              v-for="metric in DEFAULT_GROWTH_METRICS"
              :key="metric"
              type="button"
              class="dashboard-home__growth-chip"
              :class="{
                'dashboard-home__growth-chip--active': metricIsSelected(metric),
              }"
              :aria-pressed="metricIsSelected(metric)"
              @click="toggleGrowthMetric(metric)"
            >
              {{ GROWTH_METRIC_LABELS[metric] }}
            </button>
          </div>
        </div>
        <div class="dashboard-home__growth-status" aria-live="polite">
          <span v-if="growthBusy">Atualizando dados agregados...</span>
          <span v-else>Atualizado por parâmetros da URL</span>
        </div>
      </div>
      <p
        v-if="growthApiError"
        class="dashboard-home__growth-alert dashboard-home__growth-alert--warn"
      >
        {{ growthApiError }}
      </p>
      <p
        v-if="growthUnavailableMetrics.length"
        class="dashboard-home__growth-alert dashboard-home__growth-alert--muted"
      >
        Sem permissão para: {{ growthUnavailableLabel }}.
      </p>
      <div class="dashboard-home__growth-kpis">
        <StatCard
          v-if="metricIsVisible('projects')"
          title="Projetos novos (mês)"
          :value="projectGrowthInsight.currentMonthValue"
          icon="📁"
          :subtitle="`${projectGrowthInsight.totalInWindow} em ${growthWindowMonths} meses`"
          :trend="projectGrowthInsight.trend"
          :trend-value="projectGrowthInsight.trendValue"
          color="blue"
        />
        <StatCard
          v-if="metricIsVisible('tasks')"
          title="Tarefas novas (mês)"
          :value="taskGrowthInsight.currentMonthValue"
          icon="✅"
          :subtitle="`${taskGrowthInsight.totalInWindow} em ${growthWindowMonths} meses`"
          :trend="taskGrowthInsight.trend"
          :trend-value="taskGrowthInsight.trendValue"
          color="green"
        />
        <StatCard
          v-if="metricIsVisible('clients')"
          title="Clientes novos (mês)"
          :value="clientGrowthInsight.currentMonthValue"
          icon="👥"
          :subtitle="`${clientGrowthInsight.totalInWindow} em ${growthWindowMonths} meses`"
          :trend="clientGrowthInsight.trend"
          :trend-value="clientGrowthInsight.trendValue"
          color="amber"
        />
      </div>

      <div class="dashboard-home__growth-grid">
        <article
          v-if="metricIsVisible('projects')"
          class="dashboard-home__growth-card card"
        >
          <header class="dashboard-home__growth-card-head">
            <h4 class="dashboard-home__growth-card-title">Projetos por mês</h4>
            <p class="dashboard-home__growth-card-meta">
              Janela de {{ growthWindowMonths }} meses
            </p>
          </header>
          <BarChart
            :bars="projectGrowthBars"
            :show-values="false"
            :show-axis-labels="false"
            :max-bar-width="44"
          />
        </article>

        <article
          v-if="metricIsVisible('tasks')"
          class="dashboard-home__growth-card card"
        >
          <header class="dashboard-home__growth-card-head">
            <h4 class="dashboard-home__growth-card-title">Tarefas por mês</h4>
            <p class="dashboard-home__growth-card-meta">
              Janela de {{ growthWindowMonths }} meses
            </p>
          </header>
          <BarChart
            :bars="taskGrowthBars"
            :show-values="false"
            :show-axis-labels="false"
            :max-bar-width="44"
          />
        </article>

        <article
          v-if="metricIsVisible('clients')"
          class="dashboard-home__growth-card card"
        >
          <header class="dashboard-home__growth-card-head">
            <h4 class="dashboard-home__growth-card-title">Clientes por mês</h4>
            <p class="dashboard-home__growth-card-meta">
              Janela de {{ growthWindowMonths }} meses
            </p>
          </header>
          <BarChart
            :bars="clientGrowthBars"
            :show-values="false"
            :show-axis-labels="false"
            :max-bar-width="44"
          />
        </article>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="dashboard-home__section" aria-labelledby="actions-heading">
      <h3 id="actions-heading" class="dashboard-home__section-title">
        Ações Rápidas
      </h3>
      <QuickActions @action="handleQuickAction" />
    </section>

    <!-- Bento Grid Layout: Projects, Tasks, Activity -->
    <div class="dashboard-home__bento">
      <!-- Projects Column -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--projects"
      >
        <RecentProjects
          :projects="projects"
          :loading="busy"
          :max="5"
          @view-all="goToProjects"
          @view-project="viewProject"
        />
      </section>

      <!-- Tasks Column -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--tasks"
      >
        <RecentTasks
          :tasks="tasks"
          :loading="busy"
          :max="5"
          @view-all="goToTasks"
          @view-task="viewTask"
        />
      </section>

      <!-- Activity Feed -->
      <section
        class="dashboard-home__bento-item dashboard-home__bento-item--activity"
      >
        <ActivityFeed :loading="busy" :max="6" />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: left;

  &__header {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-1);
  }

  &__branding {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__page-title {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.025em;
  }

  &__page-desc {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }

  &__welcome {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.25rem;
    background: var(--surface-1);
    border: 1px solid var(--border-1);
    border-radius: var(--radius-lg, 16px);
  }

  &__welcome-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__title {
    margin: 0;
    font-size: clamp(1.125rem, 3vw, 1.375rem);
    font-weight: 700;
    color: var(--text-1);
  }

  &__subtitle {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__section--growth {
    container-type: inline-size;
    container-name: growth;
    gap: 0.82rem;
    padding-inline: clamp(0.3rem, 0.9vw, 0.55rem);
  }

  &__section--growth &__section-title {
    margin-inline-start: 0;
  }

  &__section-title {
    margin: 0 0 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__growth-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(12rem, max-content)) minmax(0, 1fr);
    align-items: start;
    gap: 0.65rem 0.85rem;
    border: 1px solid var(--border-1);
    border-radius: var(--radius-lg, 16px);
    background: var(--surface-1);
    padding: 0.82rem 0.9rem 0.82rem 1.6rem;
  }

  &__growth-toolbar-group {
    display: grid;
    gap: 0.4rem;
  }

  &__growth-toolbar-label {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__growth-toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }

  &__growth-chip {
    border: 1px solid var(--border-1);
    background: color-mix(in oklab, var(--surface-2) 84%, var(--surface-1));
    color: var(--text-2);
    border-radius: 999px;
    padding: 0.3rem 0.68rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;

    &:hover {
      border-color: color-mix(in oklab, var(--primary) 45%, var(--border-1));
      color: var(--text-1);
    }

    &:active {
      transform: translateY(1px);
    }
  }

  &__growth-chip--active {
    background: color-mix(in oklab, var(--primary) 14%, var(--surface-1));
    color: color-mix(in oklab, var(--primary) 78%, #0f172a);
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border-1));
  }

  &__growth-status {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-3);
    min-height: 1.25rem;
  }

  &__growth-alert {
    margin: 0;
    border-radius: 0.65rem;
    padding: 0.55rem 0.7rem;
    font-size: 0.82rem;
  }

  &__growth-alert--warn {
    color: color-mix(in oklab, var(--danger) 80%, #1f2937);
    border: 1px solid color-mix(in oklab, var(--danger) 35%, transparent);
    background: color-mix(in oklab, var(--danger) 11%, var(--surface-1));
  }

  &__growth-alert--muted {
    color: var(--text-2);
    border: 1px solid color-mix(in oklab, var(--text-1) 15%, transparent);
    background: color-mix(in oklab, var(--surface-2) 82%, var(--surface-1));
  }

  &__growth-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.65rem;
  }

  &__growth-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.65rem;
  }

  &__growth-card {
    padding: 1rem 1rem 1rem 1.75rem;
    border: 1px solid var(--border-1);
    border-radius: var(--radius-lg, 16px);
    background: var(--surface-1);
    display: grid;
    gap: 0.85rem;
    min-height: clamp(13.75rem, 24vw, 16rem);
  }

  &__growth-card-head {
    display: grid;
    gap: 0.22rem;
  }

  &__growth-card-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 650;
    color: var(--text-1);
  }

  &__growth-card-meta {
    margin: 0;
    font-size: 0.76rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  // Notion-style Bento Grid
  &__bento {
    display: grid;
    gap: 1.5rem;

    // Desktop: 3-column bento layout
    @media (min-width: 1024px) {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto;
      grid-template-areas: "projects tasks activity";
    }

    // Tablet: 2-column layout
    @media (min-width: 768px) and (max-width: 1023px) {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "projects tasks"
        "activity activity";
    }

    // Mobile: single column
    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      grid-template-areas:
        "projects"
        "tasks"
        "activity";
    }
  }

  &__bento-item {
    min-width: 0; // Prevent overflow

    &--projects {
      grid-area: projects;
    }

    &--tasks {
      grid-area: tasks;
    }

    &--activity {
      grid-area: activity;
    }
  }
}

@container growth (max-width: 900px) {
  .dashboard-home__growth-toolbar {
    grid-template-columns: 1fr;
  }

  .dashboard-home__growth-status {
    justify-content: flex-start;
  }
}

@container growth (max-width: 640px) {
  .dashboard-home__section--growth {
    padding-inline: 0.15rem;
    gap: 0.75rem;
  }

  .dashboard-home__growth-toolbar {
    padding: 0.8rem 0.82rem;
    gap: 0.75rem;
  }

  .dashboard-home__growth-toolbar-actions {
    gap: 0.4rem;
  }

  .dashboard-home__growth-chip {
    padding-inline: 0.7rem;
    font-size: 0.77rem;
  }
}

.btn__icon {
  width: 1rem;
  height: 1rem;
}

.btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
