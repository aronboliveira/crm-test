<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";
import ClientStatisticsService from "../../services/ClientStatisticsService";
import { ACTION_TITLES } from "../../utils/constants/dom-titles";
import DonutChart from "../charts/DonutChart.vue";
import BarChart from "../charts/BarChart.vue";
import StatCard from "../charts/StatCard.vue";
import ClientHighlightsModal from "../modal/ClientHighlightsModal.vue";

interface Props {
  clients: ClientRow[];
  projects: ProjectRow[];
  leads?: LeadRow[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  leads: () => [],
  loading: false,
});

const emit = defineEmits<{
  selectClient: [clientId: string];
}>();

type DashboardSection =
  | "overview"
  | "projects"
  | "companies"
  | "timeline"
  | "leads";

const activeFilters = ref<Set<DashboardSection>>(
  new Set(["overview", "projects", "companies", "timeline"]),
);

const showHighlightsModal = ref(false);

const sections: Array<{ id: DashboardSection; label: string; icon: string }> = [
  { id: "overview", label: "Visão Geral", icon: "📊" },
  { id: "projects", label: "Projetos", icon: "📁" },
  { id: "companies", label: "Empresas", icon: "🏢" },
  { id: "timeline", label: "Crescimento", icon: "📈" },
  { id: "leads", label: "Conversão", icon: "🎯" },
];

const toggleFilter = (sectionId: DashboardSection) => {
  if (activeFilters.value.has(sectionId)) {
    activeFilters.value.delete(sectionId);
  } else {
    activeFilters.value.add(sectionId);
  }
};

const isFilterActive = (sectionId: DashboardSection) =>
  activeFilters.value.has(sectionId);

const showAllSections = () => {
  sections.forEach((s) => activeFilters.value.add(s.id));
};

const hideAllSections = () => {
  activeFilters.value.clear();
};

const openHighlightsModal = () => {
  showHighlightsModal.value = true;
};

const closeHighlightsModal = () => {
  showHighlightsModal.value = false;
};

const handleSelectClient = (clientId: string) => {
  emit("selectClient", clientId);
};

const getSectionToggleTitle = (
  sectionId: DashboardSection,
  label: string,
): string =>
  isFilterActive(sectionId)
    ? `${ACTION_TITLES.COLLAPSE}: ${label}`
    : `${ACTION_TITLES.EXPAND}: ${label}`;

// Computed statistics
const statistics = computed(() =>
  ClientStatisticsService.calculateStatistics(props.clients, props.projects),
);

const distribution = computed(() =>
  ClientStatisticsService.calculateDistribution(props.clients, props.projects),
);

const timeline = computed(() =>
  ClientStatisticsService.calculateTimeline(props.clients),
);

const leadConversion = computed(() =>
  props.leads && props.leads.length > 0
    ? ClientStatisticsService.calculateLeadConversion(
        props.clients,
        props.leads,
      )
    : [],
);

// WhatsApp statistics
const whatsappStats = computed(() => {
  const total = props.clients.length;
  const withWhatsapp = props.clients.filter(
    (c) => c.hasWhatsapp || c.whatsappNumber,
  ).length;
  const whatsappPreferred = props.clients.filter(
    (c) => c.preferredContact === "whatsapp",
  ).length;
  const whatsappPercentage =
    total > 0 ? Math.round((withWhatsapp / total) * 100) : 0;

  return {
    total,
    withWhatsapp,
    whatsappPreferred,
    whatsappPercentage,
    withoutWhatsapp: total - withWhatsapp,
  };
});

// Chart data transformations
const companiesDonutData = computed(() => {
  const companies = statistics.value.clientsByCompany;
  const colors = [
    "#3b82f6",
    "#16a34a",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];

  return Object.entries(companies)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([company, count], i) => ({
      label: company,
      value: count,
      color: colors[i % colors.length] ?? "#3b82f6",
    }));
});

const projectDistributionBars = computed(() =>
  distribution.value.slice(0, 10).map((d) => ({
    label:
      d.clientName.length > 20
        ? d.clientName.substring(0, 20) + "..."
        : d.clientName,
    value: d.projectCount,
    color: "#3b82f6",
  })),
);

const timelineBars = computed(() =>
  timeline.value.map((t) => ({
    label: t.month,
    value: t.newClients,
    color: "#16a34a",
  })),
);

// Additional company charts
const companiesBars = computed(() => {
  const companies = statistics.value.clientsByCompany;
  return Object.entries(companies)
    .sort(([, a], [, b]) => b - a)
    .map(([company, count]) => ({
      label: company.length > 25 ? company.substring(0, 25) + "..." : company,
      value: count,
      color: "#3b82f6",
    }));
});

// Cumulative growth chart
const cumulativeGrowthBars = computed(() =>
  timeline.value.map((t) => ({
    label: t.month,
    value: t.totalClients,
    color: "#8b5cf6",
  })),
);

// Month-over-month growth rate
const growthRateBars = computed(() => {
  const rates = timeline.value.map((t, i) => {
    if (i === 0) return { label: t.month, value: 0, color: "#06b6d4" };

    const prevTotal = timeline.value[i - 1]?.totalClients ?? 0;
    const currentTotal = t.totalClients;
    const rate =
      prevTotal > 0
        ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
        : 0;

    return {
      label: t.month,
      value: rate,
      color: rate >= 10 ? "#16a34a" : rate >= 5 ? "#f59e0b" : "#06b6d4",
    };
  });

  return rates.slice(1); // Skip first month (always 0%)
});

const conversionBars = computed(() =>
  leadConversion.value.slice(0, 8).map((c) => ({
    label:
      c.clientName.length > 15
        ? c.clientName.substring(0, 15) + "..."
        : c.clientName,
    value: c.conversionRate,
    color:
      c.conversionRate >= 50
        ? "#16a34a"
        : c.conversionRate >= 30
          ? "#f59e0b"
          : "#ef4444",
  })),
);
</script>

<template>
  <div class="client-dashboard">
    <!-- Filter Section -->
    <div class="dashboard-filters card">
      <div class="filters-header">
        <h3 class="filters-title">Filtros do Dashboard</h3>
        <div class="filters-actions">
          <button
            class="btn btn-sm btn-primary"
            title="Visualizar destaques dos clientes"
            @click="openHighlightsModal"
          >
            ✨ Ver Destaques
          </button>
          <button
            class="btn btn-xs btn-ghost"
            :title="ACTION_TITLES.SELECT_ALL"
            @click="showAllSections"
          >
            Todos
          </button>
          <button
            class="btn btn-xs btn-ghost"
            :title="ACTION_TITLES.DESELECT_ALL"
            @click="hideAllSections"
          >
            Nenhum
          </button>
        </div>
      </div>
      <div class="filters-list">
        <button
          v-for="section in sections"
          :key="section.id"
          class="filter-chip"
          :class="{ 'filter-chip--active': isFilterActive(section.id) }"
          :title="getSectionToggleTitle(section.id, section.label)"
          @click="toggleFilter(section.id)"
        >
          <span class="filter-chip__icon">{{ section.icon }}</span>
          <span class="filter-chip__label">{{ section.label }}</span>
        </button>
      </div>
    </div>

    <!-- Highlights Modal -->
    <ClientHighlightsModal
      :is-open="showHighlightsModal"
      :clients="clients"
      :projects="projects"
      :leads="leads"
      @close="closeHighlightsModal"
      @select-client="handleSelectClient"
    />

    <!-- Loading State -->
    <div v-if="loading" class="dashboard-loading">
      <p>Carregando estatísticas...</p>
    </div>

    <!-- Overview Section -->
    <section v-if="isFilterActive('overview')" class="dashboard-section">
      <h2 class="section-title">📊 Visão Geral</h2>
      <div class="stats-grid">
        <StatCard
          title="Total de Clientes"
          :value="statistics.totalClients"
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Com WhatsApp"
          :value="whatsappStats.withWhatsapp"
          :subtitle="`${whatsappStats.whatsappPercentage}% do total`"
          icon="💬"
          color="green"
        />
        <StatCard
          title="WhatsApp Preferido"
          :value="whatsappStats.whatsappPreferred"
          subtitle="Meio de contato principal"
          icon="⭐"
          color="amber"
        />
        <StatCard
          title="Com Projetos"
          :value="statistics.clientsWithProjects"
          :subtitle="`${Math.round((statistics.clientsWithProjects / Math.max(statistics.totalClients, 1)) * 100)}% do total`"
          icon="✅"
          color="green"
        />
        <StatCard
          title="Sem Projetos"
          :value="statistics.clientsWithoutProjects"
          :subtitle="`${Math.round((statistics.clientsWithoutProjects / Math.max(statistics.totalClients, 1)) * 100)}% do total`"
          icon="⏳"
          color="amber"
        />
        <StatCard
          title="Média de Projetos"
          :value="statistics.averageProjectsPerClient"
          subtitle="Por cliente ativo"
          icon="📊"
          color="blue"
        />
        <StatCard
          title="Novos (30 dias)"
          :value="statistics.recentlyAdded"
          icon="🆕"
          color="green"
        />
        <StatCard
          title="Atualizados (7 dias)"
          :value="statistics.recentlyUpdated"
          icon="🔄"
          color="amber"
        />
      </div>
    </section>

    <!-- Projects Distribution Section -->
    <section v-if="isFilterActive('projects')" class="dashboard-section">
      <h2 class="section-title">📁 Distribuição de Projetos</h2>
      <div class="chart-grid">
        <div class="chart-card card">
          <h3 class="chart-title">Top 10 Clientes por Projetos</h3>
          <div v-if="projectDistributionBars.length > 0" class="chart-content">
            <BarChart :bars="projectDistributionBars" :horizontal="true" />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Top 5 Clientes</h3>
          <ul
            v-if="statistics.topClientsByProjects.length > 0"
            class="top-clients-list"
          >
            <li
              v-for="(client, i) in statistics.topClientsByProjects"
              :key="client.clientId"
              class="top-client-item"
              :title="`${client.clientName} - ${client.projectCount} projeto(s)`"
            >
              <span class="rank">{{ i + 1 }}</span>
              <span class="name">{{ client.clientName }}</span>
              <span class="count">{{ client.projectCount }} projetos</span>
            </li>
          </ul>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Companies Section -->
    <section v-if="isFilterActive('companies')" class="dashboard-section">
      <h2 class="section-title">🏢 Clientes por Empresa</h2>
      <div class="chart-grid">
        <div class="chart-card card">
          <h3 class="chart-title">Distribuição por Empresa (Top 7)</h3>
          <div
            v-if="companiesDonutData.length > 0"
            class="chart-content chart-content--centered"
          >
            <DonutChart
              :slices="companiesDonutData"
              :size="200"
              :stroke-width="35"
            />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Ranking de Empresas (Todas)</h3>
          <div v-if="companiesBars.length > 0" class="chart-content">
            <BarChart :bars="companiesBars" :horizontal="true" />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Timeline Section -->
    <section v-if="isFilterActive('timeline')" class="dashboard-section">
      <h2 class="section-title">📈 Crescimento ao Longo do Tempo</h2>

      <div class="chart-grid chart-grid--triple">
        <div class="chart-card card">
          <h3 class="chart-title">Novos Clientes por Mês</h3>
          <div v-if="timelineBars.length > 0" class="chart-content">
            <BarChart
              :bars="timelineBars"
              :horizontal="false"
              :max-bar-width="60"
              :show-axis-labels="true"
              :show-trend-line="true"
              trend-line-color="#86efac"
            />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Crescimento Acumulado</h3>
          <div v-if="cumulativeGrowthBars.length > 0" class="chart-content">
            <BarChart
              :bars="cumulativeGrowthBars"
              :horizontal="false"
              :max-bar-width="60"
              :show-axis-labels="true"
              :show-trend-line="true"
              trend-line-color="#c4b5fd"
            />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>

        <div class="chart-card card">
          <h3 class="chart-title">Taxa de Crescimento (%)</h3>
          <div v-if="growthRateBars.length > 0" class="chart-content">
            <BarChart
              :bars="growthRateBars"
              :horizontal="false"
              :max-bar-width="60"
              :show-axis-labels="true"
              :show-trend-line="true"
              trend-line-color="#67e8f9"
            />
          </div>
          <div v-else class="chart-empty">
            <p>Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Lead Conversion Section -->
    <section
      v-if="isFilterActive('leads') && leadConversion.length > 0"
      class="dashboard-section"
    >
      <h2 class="section-title">🎯 Taxa de Conversão de Leads</h2>
      <div class="chart-card card">
        <h3 class="chart-title">Top 8 Clientes por Taxa de Conversão (%)</h3>
        <div v-if="conversionBars.length > 0" class="chart-content">
          <BarChart :bars="conversionBars" :horizontal="true" />
        </div>
        <div v-else class="chart-empty">
          <p>Nenhum dado de conversão disponível</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.client-dashboard {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  margin-bottom: 1.35rem;
}

/* Filters */
.dashboard-filters {
  padding: clamp(0.78rem, 1.5vw, 0.98rem);
  padding-inline-start: clamp(1.2rem, 2.3vw, 1.7rem);
  padding-inline-end: clamp(0.78rem, 1.45vw, 1.05rem);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.72rem;
}

.filters-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-1);
}

.filters-actions {
  display: flex;
  gap: 0.5rem;
}

.filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-inline-start: clamp(0.1rem, 0.3vw, 0.2rem);
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.82rem;
  border: 1px solid var(--border-1);
  border-radius: 9999px;
  background: var(--surface-1);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-2);
}

.filter-chip:hover {
  border-color: var(--border-hover);
  background: var(--surface-2);
}

.filter-chip--active {
  border-color: color-mix(in oklab, var(--primary) 55%, var(--border-1));
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--text-1);
}

.filter-chip__icon {
  font-size: 1rem;
}

/* Loading */
.dashboard-loading {
  padding: 2rem;
  text-align: center;
  opacity: 0.7;
}

/* Sections */
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: 0.78rem;
  padding-inline-start: clamp(0.38rem, 0.75vw, 0.62rem);
  padding-inline-end: clamp(0.2rem, 0.45vw, 0.35rem);
}

.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.34rem 0;
  padding: 0 0 0.34rem 0;
  border-left: none;
  border-bottom: 1px solid color-mix(in oklab, var(--border-1) 88%, transparent);
  color: var(--text-1);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.8rem;
  padding-inline-start: clamp(0.4rem, 0.82vw, 0.64rem);
  padding-inline-end: clamp(0.2rem, 0.42vw, 0.35rem);
}

.stats-grid > * {
  margin-block: 0;
}

/* Chart Grid */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0.78rem;
  padding-inline-start: clamp(0.36rem, 0.72vw, 0.56rem);
  padding-inline-end: clamp(0.16rem, 0.36vw, 0.28rem);
}

.chart-grid--triple {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.chart-card {
  padding: clamp(0.88rem, 1.45vw, 1.05rem);
  overflow: hidden;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.72rem 0;
  color: var(--text-2);
}

.chart-content {
  min-height: 184px;
  max-height: 400px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.32rem;
}

.chart-content::-webkit-scrollbar {
  height: 6px;
}

.chart-content::-webkit-scrollbar-track {
  background: var(--scroll-track);
  border-radius: 3px;
}

.chart-content::-webkit-scrollbar-thumb {
  background: var(--scroll-thumb);
  border-radius: 3px;
}

.chart-content::-webkit-scrollbar-thumb:hover {
  background: var(--scroll-thumb-hover);
}

.chart-content--centered {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}

.chart-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--text-3);
  opacity: 0.7;
}

/* Top Clients List */
.top-clients-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.58rem;
}

.top-client-item {
  display: flex;
  align-items: center;
  gap: 0.62rem;
  padding: 0.62rem;
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: 6px;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.top-client-item:hover {
  background: color-mix(in oklab, var(--surface-2), var(--text-1) 4%);
  border-color: var(--border-hover);
}

.top-client-item .rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.top-client-item .name {
  flex: 1;
  font-weight: 500;
  color: var(--text-1);
}

.top-client-item .count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-3);
}
</style>
