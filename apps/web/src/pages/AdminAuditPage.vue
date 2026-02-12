<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import BarChart from "../components/charts/BarChart.vue";
import { useAdminAuditPage } from "../assets/scripts/pages/useAdminAuditPage";
import SafeJsonService from "../services/SafeJsonService";
import ModalService from "../services/ModalService";
import AlertService from "../services/AlertService";
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
const DashboardTableExportModal = defineAsyncComponent(
  () => import("../components/dashboard/DashboardTableExportModal.vue"),
);

// Local state for UI toggles and filters
const showCharts = ref(true);
const showFilters = ref(true);
const localSearch = ref("");
const sortColumn = ref<string | null>(null);
const sortDirection = ref<"asc" | "desc">("desc");

const stringifyAuditMeta = (meta: unknown): string =>
  SafeJsonService.stringify(meta, "");

const stringifyAuditMetaPretty = (meta: unknown): string =>
  SafeJsonService.stringify(meta, "-", 2);

// Computed: Filter rows by local search
const filteredRows = computed(() => {
  let result = [...rows.value];

  // Local search filter
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

  // Sort if column selected
  if (sortColumn.value) {
    result.sort((a: any, b: any) => {
      const aVal = a[sortColumn.value!] || "";
      const bVal = b[sortColumn.value!] || "";
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection.value === "asc" ? comparison : -comparison;
    });
  }

  return result;
});

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
  buildBlueprint: (columnKeys) => new AdminAuditCsvBlueprint({ columns: columnKeys }),
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

const buildAuditExportRows = (): AdminAuditExportRow[] =>
  filteredRows.value
    .filter((row): row is AdminAuditSliceRow => !!row)
    .map((row) => ({
      data: row.createdAt || "—",
      tipo: row.kind || "—",
      ator: row.actorEmailMasked || row.actorEmail || "—",
      alvo: row.targetEmailMasked || row.targetEmail || "—",
      meta: stringifyAuditMetaPretty(row.meta || {}),
    }));

const openExportDialog =
  async (): Promise<DashboardTableExportDialogResult | null> =>
    ModalService.open<DashboardTableExportDialogResult>(
      DashboardTableExportModal,
      {
        title: "Exportar Auditoria",
        size: "md",
        data: {
          totalRows: filteredRows.value.length,
          entityLabel: "evento(s)",
          columnOptions: ADMIN_AUDIT_EXPORT_COLUMNS,
          defaultColumnKeys: [...DEFAULT_EXPORT_COLUMN_KEYS],
          defaultFormats: ["csv", "xlsx"] as SpreadsheetExportFormat[],
        },
      },
    );

const handleOpenExportModal = async (): Promise<void> => {
  try {
    const selection = await openExportDialog();
    if (!selection) return;

    const records = buildAuditExportRows();
    if (!records.length) {
      await AlertService.error(
        "Exportação",
        "Não há eventos de auditoria para exportar.",
      );
      return;
    }

    const exportedFormats = await auditExporter.export(records, {
      formats: selection.formats,
      columnKeys: selection.columnKeys as AdminAuditExportColumnKey[],
    });

    await AlertService.success(
      "Exportação concluída",
      `${exportedFormats.map((format) => format.toUpperCase()).join(" e ")} gerado(s) com sucesso.`,
    );
  } catch (caughtError) {
    console.error("[AdminAuditPage] Export failed:", caughtError);
    await AlertService.error("Erro ao exportar", caughtError);
  }
};
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
        </div>
      </header>

      <section v-if="showCharts" class="audit-overview__content">
        <h2 class="text-lg font-bold">Estatísticas</h2>

        <div class="audit-summary-grid">
          <article class="card p-4">
            <div class="text-sm opacity-70">Total de Eventos</div>
            <div class="text-2xl font-bold">{{ rows.length }}</div>
          </article>

          <article class="card p-4">
            <div class="text-sm opacity-70">Sucessos</div>
            <div class="text-2xl font-bold text-green-500">
              {{ successFailureStats.success }}
            </div>
          </article>

          <article class="card p-4">
            <div class="text-sm opacity-70">Falhas</div>
            <div class="text-2xl font-bold text-red-500">
              {{ successFailureStats.failure }}
            </div>
          </article>

          <article class="card p-4">
            <div class="text-sm opacity-70">Tipos Únicos</div>
            <div class="text-2xl font-bold">{{ eventTypeStats.length }}</div>
          </article>
        </div>

        <div v-if="hasAuditData" class="audit-charts-grid">
          <article class="card p-4 audit-chart-card">
            <h3 class="font-semibold mb-3">Distribuição por Tipo</h3>
            <BarChart
              v-if="eventTypeBars.length"
              :bars="eventTypeBars"
              :horizontal="true"
              :show-axis-labels="false"
              :height="240"
              :max-bar-width="28"
            />
            <p v-else class="audit-empty-state">
              Sem dados suficientes para distribuir tipos.
            </p>
          </article>

          <article class="card p-4 audit-chart-card">
            <h3 class="font-semibold mb-3">Usuários Mais Ativos</h3>
            <BarChart
              v-if="topActorsBars.length"
              :bars="topActorsBars"
              :horizontal="true"
              :show-axis-labels="false"
              :height="240"
              :max-bar-width="28"
              default-color="#8b5cf6"
            />
            <p v-else class="audit-empty-state">
              Sem dados suficientes para ranking de usuários.
            </p>
          </article>

          <article class="card p-4 audit-chart-card audit-chart-card--wide">
            <h3 class="font-semibold mb-3">Eventos por Data</h3>
            <BarChart
              v-if="eventsByDateBars.length"
              :bars="eventsByDateBars"
              :show-axis-labels="false"
              :show-values="false"
              :height="250"
              :max-bar-width="32"
              default-color="#22c55e"
            />
            <p v-else class="audit-empty-state">
              Sem eventos para construir série temporal.
            </p>
          </article>
        </div>

        <p v-else class="audit-empty-state">
          Ainda não há eventos de auditoria registrados.
        </p>
      </section>
    </section>

    <!-- Filters Section -->
    <section v-if="showFilters" class="card p-4 grid gap-3">
      <h2 class="text-lg font-bold">Filtros</h2>

      <div class="grid gap-3 md:grid-cols-3">
        <label class="grid gap-1">
          <span class="font-semibold">Busca Global (Local)</span>
          <input
            class="table-search-input"
            v-model="localSearch"
            placeholder="Buscar em qualquer coluna..."
            autocomplete="off"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Buscar por E-mail (Servidor)</span>
          <input
            class="table-search-input"
            v-model="st.q"
            name="q"
            autocomplete="off"
            aria-label="Buscar por e-mail"
            placeholder="e-mail completo ou fragmento mascarado"
            @keyup.enter="load(true)"
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
        <button
          class="btn btn-ghost"
          type="button"
          @click="
            localSearch = '';
            st.q = '';
            st.kind = '';
          "
        >
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
      class="card p-3 overflow-auto"
      role="region"
      aria-label="Tabela de auditoria"
    >
      <div class="mb-2 flex justify-between items-center">
        <span class="text-sm opacity-70">
          Mostrando {{ filteredRows.length }} de {{ rows.length }} eventos
        </span>
        <span v-if="sortColumn" class="text-sm opacity-70">
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
              class="py-2 pr-3 cursor-pointer hover:opacity-100 hover:bg-white/5 select-none transition-colors"
              @click="toggleSort('targetEmailMasked')"
              @keydown="(e) => handleSortKeydown(e, 'targetEmailMasked')"
              role="button"
              tabindex="0"
              :aria-sort="
                sortColumn === 'targetEmailMasked'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              "
            >
              Alvo {{ getSortIcon("targetEmailMasked") }}
            </th>
            <th class="py-2 pr-3">Meta</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="e in filteredRows"
            :key="e._id"
            class="border-t border-white/10 hover:bg-white/5 transition-colors"
          >
            <td class="py-2 pr-3">
              <span class="text-sm">{{ e.createdAt }}</span>
            </td>
            <td class="py-2 pr-3">
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
            <td class="py-2 pr-3">
              <span class="font-mono text-sm">
                {{ e.actorEmailMasked || e.actorEmail || "-" }}
              </span>
            </td>
            <td class="py-2 pr-3">
              <span class="font-mono text-sm">
                {{ e.targetEmailMasked || e.targetEmail || "-" }}
              </span>
            </td>
            <td class="py-2 pr-3">
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
            <td colspan="5" class="py-6 opacity-70 text-center">
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
  gap: 1rem;
  padding: 1rem;
}

.audit-overview {
  display: grid;
  gap: 1rem;
  padding: 1rem;
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

.audit-overview__content {
  display: grid;
  gap: 0.9rem;
}

.audit-summary-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
}

.audit-charts-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr));
  align-items: start;
}

.audit-chart-card {
  min-height: 20rem;
}

.audit-chart-card--wide {
  grid-column: 1 / -1;
}

.audit-empty-state {
  margin: 0.4rem 0 0;
  color: var(--text-3);
  font-size: 0.88rem;
}

@media (max-width: 768px) {
  .audit-page {
    padding: 0.75rem;
  }

  .audit-overview {
    padding: 0.85rem;
  }

  .audit-overview__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .audit-summary-grid,
  .audit-charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
