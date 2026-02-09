<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import { useDashboardLeadsPage } from "../assets/scripts/pages/useDashboardLeadsPage";
import type { LeadRow, LeadStatus } from "../pinia/types/leads.types";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_ORDER,
} from "../pinia/types/leads.types";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";

const {
  rows,
  byStatus,
  loading,
  error,
  totalEstimatedValue,
  conversionRate,
  load,
} = useDashboardLeadsPage();

const viewMode = ref<"board" | "table">("board");
const filterStatus = ref<LeadStatus | "">("");

const LeadFormModal = defineAsyncComponent(
  () => import("../components/forms/LeadFormModal.vue"),
);
const CtaSuggestionsPanel = defineAsyncComponent(
  () => import("../components/leads/CtaSuggestionsPanel.vue"),
);

/* ── Filtered rows ──────────────────────────────────────── */
const filteredRows = computed(() => {
  if (!filterStatus.value) return rows.value || [];
  return (rows.value || []).filter((r) => r?.status === filterStatus.value);
});

/* ── Board columns ──────────────────────────────────────── */
const boardColumns = computed(() => {
  const active = LEAD_STATUS_ORDER.filter((s) => s !== "won" && s !== "lost");
  const all = byStatus.value || {};
  return active.map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    leads: all[status] || [],
  }));
});

const wonLeads = computed(() => (byStatus.value || {})["won"] || []);
const lostLeads = computed(() => (byStatus.value || {})["lost"] || []);

/* ── Stats ──────────────────────────────────────────────── */
const totalLeads = computed(() => (rows.value || []).length);

/* ── Helpers ────────────────────────────────────────────── */
const statusColor = (st: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "#3b82f6",
    contacted: "#8b5cf6",
    qualified: "#f59e0b",
    proposal: "#f97316",
    negotiation: "#ec4899",
    won: "#22c55e",
    lost: "#ef4444",
  };
  return map[st] || "#64748b";
};

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

/* ── Actions ────────────────────────────────────────────── */
const openCreateLead = async () => {
  const result = await ModalService.open(LeadFormModal, {
    title: "Novo Lead",
    size: "lg",
  });
  if (result) await load();
};

const openEditLead = async (lead: LeadRow) => {
  const result = await ModalService.open(LeadFormModal, {
    title: `Editar Lead: ${lead.name}`,
    size: "lg",
    data: { lead },
  });
  if (result) await load();
};

const openCtaPanel = async (lead: LeadRow) => {
  await ModalService.open(CtaSuggestionsPanel, {
    title: `CTA — ${lead.name}`,
    size: "md",
    data: { lead },
  });
  await load();
};

const handleDelete = async (lead: LeadRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Lead",
    `Tem certeza que deseja excluir "${lead.name}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.leads.remove(lead.id);
    await AlertService.success("Excluído", `"${lead.name}" foi excluído.`);
    await load();
  } catch (e) {
    console.error("[DashboardLeadsPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir lead.");
  }
};

const handleStatusChange = async (lead: LeadRow, newStatus: LeadStatus) => {
  try {
    await ApiClientService.leads.update(lead.id, { status: newStatus });
    await load();
  } catch (e) {
    console.error("[DashboardLeadsPage] Status change failed:", e);
    await AlertService.error("Erro", "Falha ao alterar status.");
  }
};

/* ── Sortable table ─────────────────────────────────────── */
const sortKey = ref<
  "name" | "company" | "status" | "source" | "estimatedValue"
>("name");
const sortDir = ref<"asc" | "desc">("asc");

const sortedRows = computed(() => {
  const list = [...(filteredRows.value || [])].filter(Boolean) as LeadRow[];
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return list.sort((a, b) => {
    const av =
      key === "estimatedValue"
        ? (a.estimatedValue ?? 0)
        : String((a as any)?.[key] ?? "").toLowerCase();
    const bv =
      key === "estimatedValue"
        ? (b.estimatedValue ?? 0)
        : String((b as any)?.[key] ?? "").toLowerCase();
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
});

const setSort = (key: typeof sortKey.value) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
    return;
  }
  sortKey.value = key;
  sortDir.value = "asc";
};

const sortIndicator = (key: typeof sortKey.value) => {
  if (sortKey.value !== key) return "";
  return sortDir.value === "asc" ? "▲" : "▼";
};
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="page-header__content">
        <h1 class="page-title">Leads</h1>
        <p class="page-subtitle">
          Funil de prospecção — acompanhe e converta potenciais clientes.
        </p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn-primary" @click="openCreateLead">
          <span class="btn-icon">+</span> Novo Lead
        </button>
      </div>
    </header>

    <!-- KPI bar -->
    <div class="leads-kpi">
      <div class="kpi-card">
        <span class="kpi-value">{{ totalLeads }}</span>
        <span class="kpi-label">Total de Leads</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ formatCurrency(totalEstimatedValue) }}</span>
        <span class="kpi-label">Pipeline Estimado</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ conversionRate }}%</span>
        <span class="kpi-label">Taxa de Conversão</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ wonLeads.length }}</span>
        <span class="kpi-label">Ganhos</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-value">{{ lostLeads.length }}</span>
        <span class="kpi-label">Perdidos</span>
      </div>
    </div>

    <!-- View mode toggle -->
    <div class="leads-toolbar">
      <div class="view-toggle">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'board' }"
          @click="viewMode = 'board'"
        >
          🗂️ Board
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'table' }"
          @click="viewMode = 'table'"
        >
          📋 Tabela
        </button>
      </div>
      <select v-model="filterStatus" class="filter-select">
        <option value="">Todos os status</option>
        <option
          v-for="[val, label] in Object.entries(LEAD_STATUS_LABELS)"
          :key="val"
          :value="val"
        >
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="p-8 text-center opacity-70">
      Carregando leads...
    </div>
    <div
      v-else-if="error && (!rows || rows.length === 0)"
      class="p-4 text-red-600 bg-red-50 rounded"
    >
      {{ error }}
    </div>

    <!-- ── BOARD VIEW ────────────────────────────────── -->
    <div v-else-if="viewMode === 'board'" class="leads-board">
      <div v-for="col in boardColumns" :key="col.status" class="board-column">
        <div
          class="board-column-header"
          :style="{ borderTopColor: statusColor(col.status) }"
        >
          <span class="board-column-title">{{ col.label }}</span>
          <span class="board-column-count">{{ col.leads.length }}</span>
        </div>
        <div class="board-column-body">
          <div v-for="lead in col.leads" :key="lead.id" class="lead-card">
            <div class="lead-card-header">
              <strong class="lead-card-name">{{ lead.name }}</strong>
              <span v-if="lead.estimatedValue" class="lead-card-value">
                {{ formatCurrency(lead.estimatedValue) }}
              </span>
            </div>
            <p v-if="lead.company" class="lead-card-company">
              {{ lead.company }}
            </p>
            <div class="lead-card-meta">
              <span class="lead-card-source">
                {{ LEAD_SOURCE_LABELS[lead.source] || lead.source }}
              </span>
              <span v-if="lead.tags?.length" class="lead-card-tags">
                <span
                  v-for="tag in lead.tags.slice(0, 2)"
                  :key="tag"
                  class="lead-tag"
                >
                  {{ tag }}
                </span>
              </span>
            </div>
            <div
              v-if="lead.campaigns?.length || lead.contracts?.length"
              class="lead-card-attach"
            >
              <span
                v-if="lead.campaigns?.length"
                class="attach-badge"
                title="Campanhas"
              >
                📢 {{ lead.campaigns.length }}
              </span>
              <span
                v-if="lead.contracts?.length"
                class="attach-badge"
                title="Contratos"
              >
                📄 {{ lead.contracts.length }}
              </span>
            </div>
            <div class="lead-card-actions">
              <button
                class="btn btn-xs btn-ghost"
                title="Editar"
                @click="openEditLead(lead)"
              >
                ✏️
              </button>
              <button
                class="btn btn-xs btn-ghost"
                title="Sugestões CTA"
                @click="openCtaPanel(lead)"
              >
                💡
              </button>
              <button
                class="btn btn-xs btn-ghost"
                title="Excluir"
                @click="handleDelete(lead)"
              >
                🗑️
              </button>
              <!-- Quick status advance -->
              <select
                class="status-quick-select"
                :value="lead.status"
                @change="
                  handleStatusChange(
                    lead,
                    ($event.target as HTMLSelectElement).value as LeadStatus,
                  )
                "
              >
                <option
                  v-for="[val, label] in Object.entries(LEAD_STATUS_LABELS)"
                  :key="val"
                  :value="val"
                >
                  {{ label }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="!col.leads.length" class="board-empty">Nenhum lead</div>
        </div>
      </div>

      <!-- Won / Lost summary -->
      <div class="board-column board-column--won">
        <div
          class="board-column-header"
          :style="{ borderTopColor: statusColor('won') }"
        >
          <span class="board-column-title">{{ LEAD_STATUS_LABELS.won }}</span>
          <span class="board-column-count">{{ wonLeads.length }}</span>
        </div>
        <div class="board-column-body">
          <div
            v-for="lead in wonLeads"
            :key="lead.id"
            class="lead-card lead-card--won"
          >
            <strong>{{ lead.name }}</strong>
            <span v-if="lead.company" class="lead-card-company">{{
              lead.company
            }}</span>
          </div>
          <div v-if="!wonLeads.length" class="board-empty">
            Nenhum lead ganho
          </div>
        </div>
      </div>
      <div class="board-column board-column--lost">
        <div
          class="board-column-header"
          :style="{ borderTopColor: statusColor('lost') }"
        >
          <span class="board-column-title">{{ LEAD_STATUS_LABELS.lost }}</span>
          <span class="board-column-count">{{ lostLeads.length }}</span>
        </div>
        <div class="board-column-body">
          <div
            v-for="lead in lostLeads"
            :key="lead.id"
            class="lead-card lead-card--lost"
          >
            <strong>{{ lead.name }}</strong>
            <span v-if="lead.lostReason" class="lead-card-reason">{{
              lead.lostReason
            }}</span>
          </div>
          <div v-if="!lostLeads.length" class="board-empty">
            Nenhum lead perdido
          </div>
        </div>
      </div>
    </div>

    <!-- ── TABLE VIEW ────────────────────────────────── -->
    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th>
              <button class="th-button" @click="setSort('name')">
                Nome <span class="th-sort">{{ sortIndicator("name") }}</span>
              </button>
            </th>
            <th>
              <button class="th-button" @click="setSort('company')">
                Empresa
                <span class="th-sort">{{ sortIndicator("company") }}</span>
              </button>
            </th>
            <th>
              <button class="th-button" @click="setSort('status')">
                Status
                <span class="th-sort">{{ sortIndicator("status") }}</span>
              </button>
            </th>
            <th>
              <button class="th-button" @click="setSort('source')">
                Origem
                <span class="th-sort">{{ sortIndicator("source") }}</span>
              </button>
            </th>
            <th>
              <button class="th-button" @click="setSort('estimatedValue')">
                Valor
                <span class="th-sort">{{
                  sortIndicator("estimatedValue")
                }}</span>
              </button>
            </th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="lead in sortedRows" :key="lead?.id || 'unknown'">
            <tr v-if="lead">
              <td class="font-medium">{{ lead.name }}</td>
              <td>{{ lead.company || "—" }}</td>
              <td>
                <span
                  class="status-badge"
                  :style="{
                    backgroundColor: statusColor(lead.status) + '20',
                    color: statusColor(lead.status),
                  }"
                >
                  {{ LEAD_STATUS_LABELS[lead.status] }}
                </span>
              </td>
              <td>{{ LEAD_SOURCE_LABELS[lead.source] || lead.source }}</td>
              <td>
                {{
                  lead.estimatedValue
                    ? formatCurrency(lead.estimatedValue)
                    : "—"
                }}
              </td>
              <td class="text-right">
                <div class="lead-actions">
                  <button
                    class="btn btn-sm btn-ghost"
                    title="Editar"
                    @click="openEditLead(lead)"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    title="CTA"
                    @click="openCtaPanel(lead)"
                  >
                    💡
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    title="Excluir"
                    @click="handleDelete(lead)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!filteredRows.length">
            <td colspan="6" class="text-center py-8 opacity-60">
              Nenhum lead encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* ── KPIs ────────────────────────────────────────── */
.leads-kpi {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.kpi-card {
  flex: 1;
  min-width: 130px;
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text, #1e293b);
}

.kpi-label {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 0.125rem;
}

/* ── Toolbar ─────────────────────────────────────── */
.leads-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.375rem;
  overflow: hidden;
}

.view-btn {
  background: var(--color-bg-card, #fff);
  border: none;
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--color-text-secondary, #64748b);
  transition: all 0.15s;
}

.view-btn.active {
  background: var(--color-primary, #3b82f6);
  color: #fff;
}

.filter-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 0.375rem;
  font-size: 0.8rem;
}

/* ── Board ───────────────────────────────────────── */
.leads-board {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.board-column {
  min-width: 220px;
  max-width: 260px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.board-column--won {
  min-width: 180px;
  max-width: 200px;
}
.board-column--lost {
  min-width: 180px;
  max-width: 200px;
}

.board-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-top: 3px solid;
  border-radius: 0.5rem 0.5rem 0 0;
}

.board-column-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.board-column-count {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-bg-secondary, #f1f5f9);
  padding: 0.125rem 0.375rem;
  border-radius: 1rem;
}

.board-column-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-secondary, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  min-height: 120px;
}

.lead-card {
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.375rem;
  padding: 0.625rem;
  cursor: default;
  transition: box-shadow 0.15s;
}

.lead-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.lead-card--won {
  border-left: 3px solid #22c55e;
}

.lead-card--lost {
  border-left: 3px solid #ef4444;
  opacity: 0.75;
}

.lead-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.lead-card-name {
  font-size: 0.85rem;
}

.lead-card-value {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-success, #22c55e);
}

.lead-card-company {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
  margin: 0.125rem 0 0.25rem;
}

.lead-card-meta {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.lead-card-source {
  font-size: 0.7rem;
  color: var(--color-text-secondary, #64748b);
  background: var(--color-bg-secondary, #f1f5f9);
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
}

.lead-tag {
  font-size: 0.65rem;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
}

.lead-card-attach {
  display: flex;
  gap: 0.375rem;
  margin: 0.25rem 0;
}

.attach-badge {
  font-size: 0.7rem;
  background: var(--color-bg-secondary, #f1f5f9);
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
}

.lead-card-reason {
  font-size: 0.7rem;
  color: var(--color-error, #ef4444);
  display: block;
  margin-top: 0.125rem;
}

.lead-card-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.375rem;
  align-items: center;
}

.status-quick-select {
  font-size: 0.65rem;
  padding: 0.125rem 0.25rem;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 0.25rem;
  margin-left: auto;
  max-width: 100px;
}

.board-empty {
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-muted, #94a3b8);
  padding: 1rem 0;
}

/* ── Table ───────────────────────────────────────── */
.status-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.lead-actions {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.th-button {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.th-sort {
  font-size: 0.7rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  font-size: 0.85rem;
}

.data-table th:nth-child(1) {
  width: 20%;
}
.data-table th:nth-child(2) {
  width: 18%;
}
.data-table th:nth-child(3) {
  width: 14%;
}
.data-table th:nth-child(4) {
  width: 16%;
}
.data-table th:nth-child(5) {
  width: 14%;
}
.data-table th:nth-child(6) {
  width: 18%;
}

@media (max-width: 768px) {
  .leads-board {
    flex-direction: column;
  }
  .board-column {
    min-width: 100%;
    max-width: 100%;
  }
  .leads-kpi {
    flex-direction: column;
  }
}
</style>
