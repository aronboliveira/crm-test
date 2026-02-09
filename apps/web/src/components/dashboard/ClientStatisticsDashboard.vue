<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";
import ClientStatisticsService from "../../services/ClientStatisticsService";
import DonutChart from "../charts/DonutChart.vue";
import BarChart from "../charts/BarChart.vue";
import StatCard from "../charts/StatCard.vue";

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

type DashboardSection =
  | "overview"
  | "projects"
  | "companies"
  | "timeline"
  | "leads";

const activeFilters = ref<Set<DashboardSection>>(
  new Set(["overview", "projects", "companies", "timeline"]),
);

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
      color: colors[i % colors.length],
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
          <button class="btn btn-xs btn-ghost" @click="showAllSections">
            Todos
          </button>
          <button class="btn btn-xs btn-ghost" @click="hideAllSections">
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
          @click="toggleFilter(section.id)"
        >
          <span class="filter-chip__icon">{{ section.icon }}</span>
          <span class="filter-chip__label">{{ section.label }}</span>
        </button>
      </div>
    </div>

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
    </section>

    <!-- Timeline Section -->
    <section v-if="isFilterActive('timeline')" class="dashboard-section">
      <h2 class="section-title">📈 Crescimento ao Longo do Tempo</h2>
      <div class="chart-card card">
        <h3 class="chart-title">Novos Clientes por Mês (Últimos 12 meses)</h3>
        <div v-if="timelineBars.length > 0" class="chart-content">
          <BarChart
            :bars="timelineBars"
            :horizontal="false"
            :max-bar-width="60"
            :show-axis-labels="true"
          />
        </div>
        <div v-else class="chart-empty">
          <p>Nenhum dado disponível</p>
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
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Filters */
.dashboard-filters {
  padding: 1rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filters-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.filters-actions {
  display: flex;
  gap: 0.5rem;
}

.filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 9999px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.filter-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.filter-chip--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .filter-chip {
    border-color: #334155;
    background: #1e293b;
    color: #cbd5e1;
  }

  .filter-chip:hover {
    border-color: #475569;
    background: #334155;
  }

  .filter-chip--active {
    border-color: #60a5fa;
    background: #1e3a8a;
    color: #93c5fd;
  }
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
  gap: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* Chart Grid */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.chart-card {
  padding: 1.5rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  opacity: 0.8;
}

.chart-content {
  min-height: 200px;
}

.chart-content--centered {
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  opacity: 0.5;
}

/* Top Clients List */
.top-clients-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-client-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  transition: background 0.2s;
}

.top-client-item:hover {
  background: #f1f5f9;
}

.top-client-item .rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.top-client-item .name {
  flex: 1;
  font-weight: 500;
}

.top-client-item .count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}
</style>
