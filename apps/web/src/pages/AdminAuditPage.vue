<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import BarChart from "../components/charts/BarChart.vue";
import DonutChart from "../components/charts/DonutChart.vue";
import { useAdminAuditPage } from "../assets/scripts/pages/useAdminAuditPage";
import AdminApiService from "../services/AdminApiService";
import SafeJsonService from "../services/SafeJsonService";
import ModalService from "../services/ModalService";
import SmartAutocompleteService from "../services/SmartAutocompleteService";
import AdminAuditQueryStateService from "../services/AdminAuditQueryStateService";
import TableExportFlowOrchestrator from "../services/TableExportFlowOrchestrator";
import {
  ADMIN_AUDIT_EXPORT_CENTERED_COLUMNS,
  ADMIN_AUDIT_EXPORT_COLUMNS,
  ADMIN_AUDIT_EXPORT_COLUMN_KEYS,
  ADMIN_AUDIT_EXPORT_COLUMN_WIDTHS,
  AdminAuditCsvBlueprint,
  SpreadsheetExporter,
  type AdminAuditExportColumnKey,
  type AdminAuditExportRow,
  type SpreadsheetExportFormat,
} from "../utils/export";
import type { AdminAuditSliceRow } from "../types/admin.types";

const { can, st, rows, busy, nextCursor, load } = useAdminAuditPage();
const route = useRoute();
const router = useRouter();
const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);
let hydratingFromRoute = false;
const EXPORT_FETCH_LIMIT = 200;
const EXPORT_MAX_PAGES = 100;

// Local state for UI toggles and filters
const showCharts = ref(true);
const showFilters = ref(true);
const showColumnVisibilityMenu = ref(false);
const localSearch = ref("");
const sortColumn = ref<string | null>(null);
const sortDirection = ref<"asc" | "desc">("desc");
const localSearchSuggestions = ref<string[]>([]);
const emailSearchSuggestions = ref<string[]>([]);

// Date range filters
const dateFrom = ref("");
const dateTo = ref("");
const datePreset = ref<string>("");

// Column visibility
const visibleColumns = ref({
  timestamp: true,
  eventType: true,
  actor: true,
  status: true,
  details: true,
});

// Actor filter
const actorFilter = ref("");
const actorFilterSuggestions = ref<string[]>([]);

const localSearchDatalistId = "audit-local-search-suggestions";
const emailSearchDatalistId = "audit-email-search-suggestions";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const localSearchAutocomplete = new SmartAutocompleteService(
  "admin-audit-local-search",
);
const emailSearchAutocomplete = new SmartAutocompleteService(
  "admin-audit-email-search",
);

const handleLocalSearchInput = (): void => {
  const inputValue = localSearch.value.trim();
  localSearchAutocomplete.commit(localSearch.value);
  localSearchSuggestions.value = localSearchAutocomplete.suggest(inputValue);
};

const handleEmailSearchInput = (): void => {
  const query = typeof st.value.q === "string" ? st.value.q : "";
  const inputValue = query.trim();
  if (EMAIL_PATTERN.test(inputValue)) {
    emailSearchAutocomplete.commit(inputValue);
  }
  emailSearchSuggestions.value = emailSearchAutocomplete
    .suggest(inputValue)
    .filter((candidate) => EMAIL_PATTERN.test(candidate));
};

const handleClearFilters = (): void => {
  localSearch.value = "";
  st.value.q = "";
  st.value.kind = "";
  actorFilter.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  datePreset.value = "";
  localSearchSuggestions.value = [];
  emailSearchSuggestions.value = [];
  actorFilterSuggestions.value = [];
};

const applyDatePreset = (preset: string): void => {
  datePreset.value = preset;
  const today = new Date();
  const formatDate = (d: Date): string => d.toISOString().split("T")[0] ?? "";

  switch (preset) {
    case "today":
      dateFrom.value = formatDate(today);
      dateTo.value = formatDate(today);
      break;
    case "last7":
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      dateFrom.value = formatDate(last7);
      dateTo.value = formatDate(today);
      break;
    case "last30":
      const last30 = new Date(today);
      last30.setDate(today.getDate() - 30);
      dateFrom.value = formatDate(last30);
      dateTo.value = formatDate(today);
      break;
    case "thisMonth":
      const firstDay = new Date(today);
      firstDay.setDate(1);
      dateFrom.value = formatDate(firstDay);
      dateTo.value = formatDate(today);
      break;
    default:
      dateFrom.value = "";
      dateTo.value = "";
  }
};

const handleActorFilterInput = (): void => {
  const uniqueActors = [
    ...new Set(
      rows.value
        .map((r) => r.actorEmailMasked || r.actorEmail)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const input = actorFilter.value.toLowerCase();
  actorFilterSuggestions.value = uniqueActors
    .filter((actor) => actor.toLowerCase().includes(input))
    .slice(0, 10);
};

const toggleColumnVisibilityMenu = (): void => {
  showColumnVisibilityMenu.value = !showColumnVisibilityMenu.value;
};

const resolveStatusLabel = (kind?: string): string => {
  if (!kind) return "Informativo";
  if (kind.includes("success")) return "Sucesso";
  if (kind.includes("failure")) return "Falha";
  return "Informativo";
};

onBeforeUnmount(() => {
  localSearchAutocomplete.cancel();
  emailSearchAutocomplete.cancel();
});

const stringifyAuditMeta = (meta: unknown): string =>
  SafeJsonService.stringify(meta, "");

const stringifyAuditMetaPretty = (meta: unknown): string =>
  SafeJsonService.stringify(meta, "-", 2);

const applyLocalFiltersAndSort = (
  sourceRows: readonly AdminAuditSliceRow[],
): AdminAuditSliceRow[] => {
  let result = [...sourceRows];

  if (localSearch.value.trim()) {
    const search = localSearch.value.toLowerCase();
    result = result.filter((row) => {
      return (
        row.kind?.toLowerCase().includes(search) ||
        row.actorEmailMasked?.toLowerCase().includes(search) ||
        row.targetEmailMasked?.toLowerCase().includes(search) ||
        row.createdAt?.toLowerCase().includes(search) ||
        stringifyAuditMeta(row.meta ?? "")
          .toLowerCase()
          .includes(search)
      );
    });
  }

  // Date range filter
  if (dateFrom.value) {
    result = result.filter((row) => {
      const rowDate = row.createdAt?.split("T")[0] || "";
      return rowDate >= dateFrom.value;
    });
  }
  if (dateTo.value) {
    result = result.filter((row) => {
      const rowDate = row.createdAt?.split("T")[0] || "";
      return rowDate <= dateTo.value;
    });
  }

  // Actor filter
  if (actorFilter.value.trim()) {
    const actorSearch = actorFilter.value.toLowerCase();
    result = result.filter((row) => {
      const actor = row.actorEmailMasked || row.actorEmail || "";
      return actor.toLowerCase().includes(actorSearch);
    });
  }

  if (sortColumn.value) {
    result.sort((a: any, b: any) => {
      const aVal = a[sortColumn.value!] || "";
      const bVal = b[sortColumn.value!] || "";
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection.value === "asc" ? comparison : -comparison;
    });
  }

  return result;
};

// Computed: Filter rows by local search
const filteredRows = computed(() => applyLocalFiltersAndSort(rows.value));

// Toggle sort
const toggleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortColumn.value = column;
    sortDirection.value = "asc";
  }
};

// Get sort indicator
const getSortIcon = (column: string) => {
  if (sortColumn.value !== column) return "⇅";
  return sortDirection.value === "asc" ? "↑" : "↓";
};

// Keyboard handler for sortable columns
const handleSortKeydown = (event: KeyboardEvent, column: string) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSort(column);
  }
};

// Computed: Event type distribution
const eventTypeStats = computed(() => {
  const counts: Record<string, number> = {};
  rows.value.forEach((row) => {
    counts[row.kind] = (counts[row.kind] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
});

// Computed: Success vs failure
const successFailureStats = computed(() => {
  let success = 0;
  let failure = 0;
  rows.value.forEach((row) => {
    if (row.kind.includes("success")) success++;
    if (row.kind.includes("failure")) failure++;
  });
  return { success, failure };
});

// Computed: Events by date (aggregated by day)
const eventsByDate = computed(() => {
  const byDate: Record<string, number> = {};
  rows.value.forEach((row) => {
    const date = row.createdAt?.split("T")[0] || "unknown";
    byDate[date] = (byDate[date] || 0) + 1;
  });
  return Object.entries(byDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
});

// Computed: Top actors
const topActors = computed(() => {
  const actorCounts: Record<string, number> = {};
  rows.value.forEach((row) => {
    const actor = row.actorEmailMasked || "unknown";
    actorCounts[actor] = (actorCounts[actor] || 0) + 1;
  });
  return Object.entries(actorCounts)
    .map(([actor, count]) => ({ actor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

// Computed: Events by hour (0-23)
const eventsByHour = computed(() => {
  const byHour: Record<number, number> = {};
  for (let i = 0; i < 24; i++) byHour[i] = 0;

  rows.value.forEach((row) => {
    if (!row.createdAt) return;
    const hour = parseInt(
      row.createdAt.split("T")[1]?.split(":")[0] || "0",
      10,
    );
    if (!isNaN(hour) && hour >= 0 && hour < 24) {
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }
  });

  return Object.entries(byHour)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => a.hour - b.hour);
});

// Computed: Success/Failure Donut slices
const successFailureSlices = computed(() => {
  const stats = successFailureStats.value;
  const total = stats.success + stats.failure;
  if (total === 0) return [];

  return [
    {
      label: "Sucesso",
      value: stats.success,
      color: "#22c55e",
    },
    {
      label: "Falha",
      value: stats.failure,
      color: "#ef4444",
    },
  ].filter((s) => s.value > 0);
});

const hasAuditData = computed(() => rows.value.length > 0);

const truncateLabel = (label: string, maxLength = 28): string => {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
};

const eventTypeBars = computed(() =>
  eventTypeStats.value.slice(0, 8).map((stat) => ({
    label: truncateLabel(stat.kind, 30),
    value: stat.count,
    color: "#3b82f6",
  })),
);

const topActorsBars = computed(() =>
  topActors.value.slice(0, 8).map((actor) => ({
    label: truncateLabel(actor.actor, 24),
    value: actor.count,
    color: "#8b5cf6",
  })),
);

const eventsByDateBars = computed(() =>
  eventsByDate.value.slice(-14).map((day) => ({
    label: day.date.slice(5),
    value: day.count,
    color: "#22c55e",
  })),
);

const eventsByHourBars = computed(() =>
  eventsByHour.value.map((hourData) => ({
    label: `${hourData.hour}h`,
    value: hourData.count,
    color: "#f59e0b",
  })),
);

type DashboardTableExportDialogResult = {
  formats: SpreadsheetExportFormat[];
  columnKeys: string[];
};

const DEFAULT_EXPORT_COLUMN_KEYS = [
  ...ADMIN_AUDIT_EXPORT_COLUMN_KEYS,
] as AdminAuditExportColumnKey[];

const auditExporter = new SpreadsheetExporter<
  AdminAuditExportRow,
  AdminAuditExportColumnKey,
  AdminAuditCsvBlueprint
>({
  fileNamePrefix: "auditoria-admin",
  sheetName: "Auditoria",
  defaultColumnKeys: DEFAULT_EXPORT_COLUMN_KEYS,
  buildBlueprint: (columnKeys) =>
    new AdminAuditCsvBlueprint({ columns: columnKeys }),
  columnWidthByKey: ADMIN_AUDIT_EXPORT_COLUMN_WIDTHS,
  centeredColumnKeys: ADMIN_AUDIT_EXPORT_CENTERED_COLUMNS,
  resolveCellStyle: ({ columnKey, record }) => {
    if (columnKey !== "tipo") return null;
    if (record.tipo.includes("success")) {
      return {
        fillColor: "FFECFDF5",
        fontColor: "FF166534",
        bold: true,
      };
    }
    if (record.tipo.includes("failure")) {
      return {
        fillColor: "FFFEE2E2",
        fontColor: "FFB91C1C",
        bold: true,
      };
    }
    return null;
  },
});
const exportFlow = new TableExportFlowOrchestrator("AdminAuditPage");

const buildAuditExportRows = (
  sourceRows: readonly AdminAuditSliceRow[] = filteredRows.value,
): AdminAuditExportRow[] =>
  sourceRows
    .filter((row): row is AdminAuditSliceRow => !!row)
    .map((row) => ({
      data: row.createdAt || "—",
      tipo: row.kind || "—",
      ator: row.actorEmailMasked || row.actorEmail || "—",
      alvo: row.targetEmailMasked || row.targetEmail || "—",
      meta: stringifyAuditMetaPretty(row.meta || {}),
    }));

const fetchAllFilteredRowsForExport = async (): Promise<
  AdminAuditSliceRow[]
> => {
  const deduped = new Map<string, AdminAuditSliceRow>();
  let cursor: string | undefined;

  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const response = await AdminApiService.auditList({
      q: st.value.q.trim() || undefined,
      kind: st.value.kind.trim() || undefined,
      cursor,
      limit: EXPORT_FETCH_LIMIT,
    });

    const pageRows = (Array.isArray(response?.items) ? response.items : []).map(
      (item) => {
        const row = item as any;
        return {
          ...row,
          id: String(row?.id ?? row?._id ?? ""),
        } as AdminAuditSliceRow;
      },
    );
    if (!pageRows.length) break;

    pageRows.forEach((row, rowIndex) => {
      const id = String(
        row.id || row._id || `${row.createdAt || ""}-${rowIndex}`,
      );
      deduped.set(id, row);
    });

    const next = String(response?.nextCursor || "").trim();
    if (!next) break;
    cursor = next;
  }

  return [...deduped.values()];
};

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Auditoria",
        size: "md",
        data: {
          presetKey: "admin.audit",
          totalRows: filteredRows.value.length,
          entityLabel: "evento(s)",
          columnOptions: ADMIN_AUDIT_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  await exportFlow.execute({
    openDialog: openExportDialog,
    emptyStateMessage: "Não há eventos de auditoria para exportar.",
    buildRecords: async () =>
      buildAuditExportRows(
        applyLocalFiltersAndSort(await fetchAllFilteredRowsForExport()),
      ),
    exportRecords: async (records, selection) =>
      auditExporter.export(records, {
        formats: selection.formats,
        columnKeys: selection.columnKeys as AdminAuditExportColumnKey[],
      }),
  });
};

const buildRouteState = () => ({
  q: String(st.value.q || "").trim(),
  kind: String(st.value.kind || "").trim(),
});

const applyRouteState = (query: typeof route.query): boolean => {
  const parsed = AdminAuditQueryStateService.fromQuery(query);
  const hasChanges =
    parsed.q !== String(st.value.q || "").trim() ||
    parsed.kind !== String(st.value.kind || "").trim();

  if (!hasChanges) return false;

  hydratingFromRoute = true;
  st.value.q = parsed.q;
  st.value.kind = parsed.kind;
  hydratingFromRoute = false;
  return true;
};

const syncRouteQuery = (): void => {
  if (hydratingFromRoute) return;
  const nextState = buildRouteState();
  if (AdminAuditQueryStateService.isSameState(route.query, nextState)) {
    return;
  }
  void router
    .replace({ query: AdminAuditQueryStateService.toQuery(nextState) })
    .catch((caughtError) => {
      console.error("[AdminAuditPage] route sync failed:", caughtError);
    });
};

applyRouteState(route.query);

watch([() => st.value.q, () => st.value.kind], () => {
  syncRouteQuery();
});

watch(
  () => route.query,
  (query) => {
    const changed = applyRouteState(query);
    if (changed) {
      void load(true);
    }
  },
);

onMounted(() => {
  syncRouteQuery();
});
</script>

<template>
  <div v-if="can" class="audit-page" aria-label="Auditoria">
    <section class="audit-overview card" aria-label="Resumo e estatísticas">
      <header class="audit-overview__header">
        <div class="audit-overview__intro">
          <h1 class="text-xl font-black">Auditoria</h1>
          <p class="opacity-70">Eventos de autenticação e administração.</p>
        </div>

        <div class="audit-overview__actions">
          <button
            class="btn btn-ghost"
            type="button"
            title="Exportar eventos filtrados"
            @click="handleOpenExportModal"
          >
            Exportar...
          </button>
          <button
            class="btn btn-ghost"
            type="button"
            @click="showCharts = !showCharts"
            :aria-pressed="showCharts"
          >
            {{ showCharts ? "Ocultar" : "Mostrar" }} Gráficos
          </button>
          <button
            class="btn btn-ghost"
            type="button"
            @click="showFilters = !showFilters"
            :aria-pressed="showFilters"
          >
            {{ showFilters ? "Ocultar" : "Mostrar" }} Filtros
          </button>
          <input
            type="date"
            class="table-search-input audit-filter-input audit-filter-input--date-from audit-overview__quick-date"
            v-model="dateFrom"
            aria-label="Data inicial"
          />
          <input
            type="date"
            class="table-search-input audit-filter-input audit-filter-input--date-to audit-overview__quick-date"
            v-model="dateTo"
            aria-label="Data final"
          />
          <input
            class="table-search-input audit-filter-input audit-filter-input--actor audit-overview__quick-actor"
            v-model="actorFilter"
            aria-label="Filtrar por ator"
            placeholder="Ator..."
            @input="handleActorFilterInput"
          />
          <button
            class="btn btn-sm btn-ghost"
            type="button"
            @click="applyDatePreset('today')"
          >
            Hoje
          </button>
          <button
            class="btn btn-sm btn-ghost"
            type="button"
            @click="applyDatePreset('last7')"
          >
            Últimos 7 dias
          </button>
          <button
            class="btn btn-sm btn-ghost"
            type="button"
            @click="applyDatePreset('last30')"
          >
            Últimos 30 dias
          </button>
          <button
            class="btn btn-sm btn-ghost"
            type="button"
            @click="applyDatePreset('thisMonth')"
          >
            Este mês
          </button>
          <div class="relative audit-column-visibility">
            <button
              class="btn btn-sm btn-ghost cursor-pointer audit-column-visibility__trigger"
              type="button"
              @click="toggleColumnVisibilityMenu"
            >
              Colunas Visíveis ▾
            </button>
            <div
              v-show="showColumnVisibilityMenu"
              class="absolute right-0 mt-1 p-3 bg-gray-800 border border-white/10 rounded shadow-lg z-10 min-w-52 audit-column-visibility__menu"
            >
              <div class="grid gap-2">
                <label
                  class="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    data-col="timestamp"
                    v-model="visibleColumns.timestamp"
                  />
                  <span>Data</span>
                </label>
                <label
                  class="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    data-col="eventType"
                    v-model="visibleColumns.eventType"
                  />
                  <span>Tipo</span>
                </label>
                <label
                  class="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    data-col="actor"
                    v-model="visibleColumns.actor"
                  />
                  <span>Ator</span>
                </label>
                <label
                  class="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    data-col="status"
                    v-model="visibleColumns.status"
                  />
                  <span>Status</span>
                </label>
                <label
                  class="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    data-col="details"
                    v-model="visibleColumns.details"
                  />
                  <span>Detalhes</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        v-if="showCharts"
        class="audit-overview__content audit-charts-section"
      >
        <h2 class="text-lg font-bold">Estatísticas</h2>

        <div class="audit-summary-grid">
          <article class="card audit-stat-card">
            <div class="text-sm opacity-70">Total de Eventos</div>
            <div class="text-2xl font-bold">{{ rows.length }}</div>
          </article>

          <article class="card audit-stat-card">
            <div class="text-sm opacity-70">Sucessos</div>
            <div class="text-2xl font-bold text-green-500">
              {{ successFailureStats.success }}
            </div>
          </article>

          <article class="card audit-stat-card">
            <div class="text-sm opacity-70">Falhas</div>
            <div class="text-2xl font-bold text-red-500">
              {{ successFailureStats.failure }}
            </div>
          </article>

          <article class="card audit-stat-card">
            <div class="text-sm opacity-70">Tipos Únicos</div>
            <div class="text-2xl font-bold">{{ eventTypeStats.length }}</div>
          </article>
        </div>

        <div v-if="hasAuditData" class="audit-charts-grid">
          <article
            id="audit-chart-success-failure"
            class="card audit-chart-card"
            aria-label="Gráfico de sucesso e falha"
          >
            <h3 class="font-semibold mb-3">Sucesso vs Falha</h3>
            <div
              v-if="successFailureSlices.length"
              class="flex justify-center py-4"
            >
              <DonutChart
                :slices="successFailureSlices"
                :size="200"
                :stroke-width="35"
                :center-value="rows.length.toString()"
                center-label="Total"
              />
            </div>
            <p v-else class="audit-empty-state">
              Sem dados suficientes para proporção sucesso/falha.
            </p>
          </article>

          <article
            id="audit-chart-hourly-activity"
            class="card audit-chart-card"
            aria-label="Gráfico de atividade por hora"
          >
            <h3 class="font-semibold mb-3">Distribuição por Hora</h3>
            <BarChart
              v-if="eventsByHourBars.length"
              :bars="eventsByHourBars"
              :show-axis-labels="false"
              :show-values="false"
              :height="220"
              :max-bar-width="16"
              default-color="#f59e0b"
            />
            <p v-else class="audit-empty-state">
              Sem dados horários disponíveis.
            </p>
          </article>
        </div>

        <p v-else class="audit-empty-state">
          Ainda não há eventos de auditoria registrados.
        </p>
      </section>
    </section>

    <!-- Filters Section -->
    <section v-if="showFilters" class="card audit-filters-card">
      <h2 class="text-lg font-bold mb-4">Filtros</h2>

      <div class="grid gap-3 md:grid-cols-3 mb-4">
        <label class="grid gap-1">
          <span class="font-semibold">Busca Global (Local)</span>
          <input
            class="table-search-input audit-filter-input audit-filter-input--search"
            v-model="localSearch"
            :list="localSearchDatalistId"
            placeholder="Buscar em qualquer coluna..."
            autocomplete="section-audit search"
            @input="handleLocalSearchInput"
          />
          <datalist :id="localSearchDatalistId">
            <option
              v-for="option in localSearchSuggestions"
              :key="`audit-local-search-${option}`"
              :value="option"
            />
          </datalist>
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Buscar por E-mail (Servidor)</span>
          <input
            class="table-search-input audit-filter-input audit-filter-input--email"
            v-model="st.q"
            :list="emailSearchDatalistId"
            type="email"
            name="q"
            autocomplete="section-audit email"
            inputmode="email"
            aria-label="Buscar por e-mail"
            placeholder="nome@dominio.com"
            @input="handleEmailSearchInput"
            @keyup.enter="load(true)"
          />
          <datalist :id="emailSearchDatalistId">
            <option
              v-for="option in emailSearchSuggestions"
              :key="`audit-email-search-${option}`"
              :value="option"
            />
          </datalist>
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Filtrar por Ator</span>
          <input
            class="table-search-input audit-filter-input audit-filter-input--email"
            v-model="actorFilter"
            aria-label="Filtrar por ator"
            placeholder="Email do ator..."
            @input="handleActorFilterInput"
          />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-3 mb-4">
        <label class="grid gap-1">
          <span class="font-semibold">Data Inicial</span>
          <input
            type="date"
            class="table-search-input"
            v-model="dateFrom"
            aria-label="Data inicial"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Data Final</span>
          <input
            type="date"
            class="table-search-input"
            v-model="dateTo"
            aria-label="Data final"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Tipo de Evento</span>
          <select
            class="table-search-input"
            v-model="st.kind"
            aria-label="Filtrar por tipo"
            @change="load(true)"
          >
            <option value="">Todos</option>
            <option value="auth.login.success">Login - Sucesso</option>
            <option value="auth.login.failure">Login - Falha</option>
            <option value="auth.password_reset.requested">
              Reset Senha - Solicitado
            </option>
            <option value="auth.password_reset.completed">
              Reset Senha - Completo
            </option>
            <option value="admin.user.role_changed">
              Admin - Papel Alterado
            </option>
            <option value="admin.user.force_reset">
              Admin - Reset Forçado
            </option>
            <option value="admin.user.locked">Admin - Bloqueado</option>
            <option value="admin.user.unlocked">Admin - Desbloqueado</option>
          </select>
        </label>
      </div>

      <div class="flex gap-2 justify-end">
        <button class="btn btn-ghost" type="button" @click="handleClearFilters">
          Limpar Filtros
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="busy"
          :aria-disabled="busy"
          @click="load(true)"
        >
          Atualizar Dados
        </button>
      </div>
    </section>

    <!-- Data Table Section -->
    <div
      class="card audit-table-card overflow-auto"
      role="region"
      aria-label="Tabela de auditoria"
    >
      <div class="mb-3 flex justify-between items-center flex-wrap gap-2">
        <span class="text-sm opacity-70">
          Mostrando {{ filteredRows.length }} de {{ rows.length }} eventos
        </span>
        <span v-if="sortColumn" class="text-sm opacity-70 flex items-center">
          Ordenado por: {{ sortColumn }} {{ getSortIcon(sortColumn) }}
        </span>
      </div>

      <table
        class="min-w-265 w-full"
        role="table"
        aria-label="Lista de eventos de auditoria"
      >
        <thead>
          <tr class="text-left opacity-80">
            <th
              v-show="visibleColumns.timestamp"
              class="py-2 pr-3 cursor-pointer hover:opacity-100 hover:bg-white/5 select-none transition-colors"
              @click="toggleSort('createdAt')"
              @keydown="(e) => handleSortKeydown(e, 'createdAt')"
              role="button"
              tabindex="0"
              :aria-sort="
                sortColumn === 'createdAt'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              "
            >
              Data {{ getSortIcon("createdAt") }}
            </th>
            <th
              v-show="visibleColumns.eventType"
              class="py-2 pr-3 cursor-pointer hover:opacity-100 hover:bg-white/5 select-none transition-colors"
              @click="toggleSort('kind')"
              @keydown="(e) => handleSortKeydown(e, 'kind')"
              role="button"
              tabindex="0"
              :aria-sort="
                sortColumn === 'kind'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              "
            >
              Tipo {{ getSortIcon("kind") }}
            </th>
            <th
              v-show="visibleColumns.actor"
              class="py-2 pr-3 cursor-pointer hover:opacity-100 hover:bg-white/5 select-none transition-colors"
              @click="toggleSort('actorEmailMasked')"
              @keydown="(e) => handleSortKeydown(e, 'actorEmailMasked')"
              role="button"
              tabindex="0"
              :aria-sort="
                sortColumn === 'actorEmailMasked'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              "
            >
              Ator {{ getSortIcon("actorEmailMasked") }}
            </th>
            <th
              v-show="visibleColumns.status"
              class="py-2 pr-3"
            >
              Status
            </th>
            <th v-show="visibleColumns.details" class="py-2 pr-3">Detalhes</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="e in filteredRows"
            :key="e._id"
            class="border-t border-white/10 hover:bg-white/5 transition-colors"
          >
            <td v-show="visibleColumns.timestamp" class="py-2 pr-3">
              <span class="text-sm">{{ e.createdAt }}</span>
            </td>
            <td v-show="visibleColumns.eventType" class="py-2 pr-3">
              <span
                class="inline-block px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-green-500/20 text-green-400': e.kind.includes('success'),
                  'bg-red-500/20 text-red-400': e.kind.includes('failure'),
                  'bg-blue-500/20 text-blue-400':
                    !e.kind.includes('success') && !e.kind.includes('failure'),
                }"
              >
                {{ e.kind }}
              </span>
            </td>
            <td v-show="visibleColumns.actor" class="py-2 pr-3">
              <span class="font-mono text-sm">
                {{ e.actorEmailMasked || e.actorEmail || "-" }}
              </span>
            </td>
            <td v-show="visibleColumns.status" class="py-2 pr-3">
              <span
                class="inline-block px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-green-500/20 text-green-400': e.kind.includes('success'),
                  'bg-red-500/20 text-red-400': e.kind.includes('failure'),
                  'bg-blue-500/20 text-blue-400':
                    !e.kind.includes('success') && !e.kind.includes('failure'),
                }"
              >
                {{ resolveStatusLabel(e.kind) }}
              </span>
            </td>
            <td v-show="visibleColumns.details" class="py-2 pr-3">
              <details v-if="e.meta" class="cursor-pointer">
                <summary class="text-xs opacity-70 hover:opacity-100">
                  Ver detalhes
                </summary>
                <code
                  class="block mt-1 text-xs opacity-80 bg-black/20 p-2 rounded max-w-md overflow-auto"
                  style="word-break: break-word"
                >
                  {{ stringifyAuditMetaPretty(e.meta) }}
                </code>
              </details>
              <span v-else class="opacity-50">-</span>
            </td>
          </tr>

          <tr v-if="!filteredRows.length && !busy">
            <td
              :colspan="Object.values(visibleColumns).filter(Boolean).length"
              class="py-6 opacity-70 text-center"
            >
              {{
                localSearch.trim()
                  ? "Nenhum evento encontrado com os filtros aplicados."
                  : "Nenhum evento."
              }}
            </td>
          </tr>

          <tr v-if="busy">
            <td colspan="5" class="py-6 opacity-70 text-center">
              Carregando...
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between items-center">
      <div class="text-sm opacity-70">
        <span v-if="filteredRows.length !== rows.length">
          {{ filteredRows.length }} filtrado(s) de {{ rows.length }} total
        </span>
        <span v-else>{{ rows.length }} evento(s) carregado(s)</span>
      </div>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy || !nextCursor"
        :aria-disabled="busy || !nextCursor"
        @click="load(false)"
      >
        Carregar mais
      </button>
    </div>
  </div>

  <div v-else class="p-6 opacity-70" aria-label="Acesso negado">
    Acesso negado.
  </div>
</template>

<style scoped lang="scss">
.audit-page {
  width: min(100%, 1500px);
  margin-inline: auto;
  display: grid;
  gap: 1.2rem;
  padding: clamp(0.7rem, 0.9vw, 1.05rem);
}

.audit-page .card::before {
  display: none;
}

.audit-page .card {
  border-color: color-mix(in oklab, var(--border-1), transparent 8%);
}

.audit-overview {
  display: grid;
  gap: 1.15rem;
  padding: clamp(0.9rem, 1.2vw, 1.2rem);
}

.audit-overview__header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
}

.audit-overview__intro {
  display: grid;
  gap: 0.35rem;
  max-width: 44rem;
}

.audit-overview__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.audit-overview__quick-date {
  width: 10rem;
}

.audit-overview__quick-actor {
  width: 11rem;
}

.audit-overview__content {
  display: grid;
  gap: 1.15rem;
}

.audit-stat-card {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  align-content: center;
  text-align: center;
  min-height: 5.5rem;
  padding: 1.2rem 1.35rem;
}

.audit-summary-grid {
  display: grid;
  gap: 0.95rem;
  grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
}

.audit-charts-grid {
  display: grid;
  gap: 0.95rem;
  grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr));
  align-items: start;
}

.audit-chart-card {
  min-height: 14rem;
  padding: 1.2rem 1.3rem 1.35rem;
}

.audit-chart-card--wide {
  grid-column: 1 / -1;
}

.audit-chart-card h3 {
  margin-bottom: 0.75rem;
}

.audit-filters-card {
  display: grid;
  gap: 0.9rem;
  padding: 0.95rem 1rem 1rem;

  --audit-filter-icon-size: 0.96rem;
  --audit-filter-icon-x: 0.64rem;
  --audit-filter-search: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0'/%3E%3C/svg%3E");
  --audit-filter-email: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z'/%3E%3Cpath d='M14.247 14.269c1.01 0 1.587-.857 1.587-2.025v-.21C15.834 10.43 14.64 9 12.52 9h-.035C10.42 9 9 10.36 9 12.432v.214C9 14.82 10.438 16 12.358 16h.044c.594 0 1.018-.074 1.237-.175v-.73c-.245.11-.673.18-1.18.18h-.044c-1.334 0-2.571-.788-2.571-2.655v-.157c0-1.657 1.058-2.724 2.64-2.724h.04c1.535 0 2.484 1.05 2.484 2.326v.118c0 .975-.324 1.39-.639 1.39-.232 0-.41-.148-.41-.42v-2.19h-.906v.569h-.03c-.084-.298-.368-.63-.954-.63-.778 0-1.259.555-1.259 1.4v.528c0 .892.49 1.434 1.26 1.434.471 0 .896-.227 1.014-.643h.043c.118.42.617.648 1.12.648m-2.453-1.588v-.227c0-.546.227-.791.573-.791.297 0 .572.192.572.708v.367c0 .573-.253.744-.564.744-.354 0-.581-.215-.581-.8Z'/%3E%3C/svg%3E");
}

.audit-filter-input {
  padding-inline-start: calc(
    var(--audit-filter-icon-x) + var(--audit-filter-icon-size) + 0.52rem
  );
  background-repeat: no-repeat;
  background-position: var(--audit-filter-icon-x) center;
  background-size: var(--audit-filter-icon-size) var(--audit-filter-icon-size);
}

.audit-filter-input--search {
  background-image: var(--audit-filter-search);
}

.audit-filter-input--email {
  background-image: var(--audit-filter-email);
}

.audit-filter-input[type="email"]:not(:placeholder-shown):valid {
  border-color: color-mix(in oklab, var(--success) 60%, var(--border-1));
  color: color-mix(in oklab, var(--success) 34%, var(--text-1));
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--success) 22%, transparent);
  outline: none;
}

.audit-filter-input[type="email"]:not(:placeholder-shown):invalid {
  border-color: color-mix(in oklab, var(--danger) 58%, var(--border-1));
  color: color-mix(in oklab, var(--danger) 28%, var(--text-1));
}

.audit-table-card {
  padding: 0.95rem 1rem 1rem;
}

.audit-empty-state {
  margin: 0.4rem 0 0;
  color: var(--text-3);
  font-size: 0.88rem;
}

@media (max-width: 768px) {
  .audit-page {
    padding: 0.56rem;
  }

  .audit-overview {
    padding: 0.78rem;
  }

  .audit-overview__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .audit-summary-grid,
  .audit-charts-grid {
    grid-template-columns: 1fr;
  }

  .audit-chart-card,
  .audit-table-card,
  .audit-filters-card,
  .audit-stat-card {
    padding: 0.95rem;
  }
}
</style>
