<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useDashboardClientsPage } from "../assets/scripts/pages/useDashboardClientsPage";
import { useClientQuery } from "../composables/useClientQuery";
import ModalService from "../services/ModalService";
import ApiClientService from "../services/ApiClientService";
import AlertService from "../services/AlertService";
import { useProjectsStore } from "../pinia/stores/projects.store";
import { useLeadsStore } from "../pinia/stores/leads.store";
import type { ClientRow } from "../pinia/types/clients.types";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { LeadRow } from "../pinia/types/leads.types";
import ClientStatisticsDashboard from "../components/dashboard/ClientStatisticsDashboard.vue";
import ClientDetailView from "../components/client/ClientDetailView.vue";
import {
  TABLE_DATA_ATTRS,
  CLIENT_DATA_ATTRS,
  TEST_DATA_ATTRS,
} from "../utils/constants/dom-data-attrs";

const { rows, loading, error, load } = useDashboardClientsPage();
const projectsStore = useProjectsStore();
const leadsStore = useLeadsStore();
const { selectedClientId, setClientQuery, clearClientQuery } = useClientQuery();

const expandedClientId = ref<string | null>(null);

onMounted(async () => {
  if (!projectsStore.rows.length) await projectsStore.list();
  if (!leadsStore.rows.length) await leadsStore.list();

  if (selectedClientId.value) {
    expandedClientId.value = selectedClientId.value;
  }
});

const toggleClientExpand = async (clientId: string) => {
  if (expandedClientId.value === clientId) {
    expandedClientId.value = null;
    await clearClientQuery();
  } else {
    expandedClientId.value = clientId;
    await setClientQuery(clientId);
  }
};

const handleSelectClientFromHighlights = async (clientId: string) => {
  expandedClientId.value = clientId;
  await setClientQuery(clientId);

  const element = document.getElementById(`client-row-${clientId}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const sortKey = ref<"name" | "company" | "email" | "phone" | "whatsapp">(
  "name",
);
const sortDir = ref<"asc" | "desc">("asc");

const safeRows = computed(
  () => (rows.value || []).filter(Boolean) as ClientRow[],
);
const safeProjects = computed(
  () => (projectsStore.rows || []).filter(Boolean) as ProjectRow[],
);
const safeLeads = computed(
  () => (leadsStore.rows || []).filter(Boolean) as LeadRow[],
);

const sortedRows = computed(() => {
  const list = safeRows.value;
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    // Special handling for whatsapp sorting
    if (key === "whatsapp") {
      const av = String(a.whatsappNumber || a.cellPhone || "").toLowerCase();
      const bv = String(b.whatsappNumber || b.cellPhone || "").toLowerCase();
      return av.localeCompare(bv) * dir;
    }
    const av = String((a as any)?.[key] ?? "").toLowerCase();
    const bv = String((b as any)?.[key] ?? "").toLowerCase();
    return av.localeCompare(bv) * dir;
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

const ProjectsTableModal = defineAsyncComponent(
  () => import("../components/dashboard/ProjectsTableModal.vue"),
);

const ClientFormModal = defineAsyncComponent(
  () => import("../components/forms/ClientFormModal.vue"),
);

const openCreateClient = async () => {
  const result = await ModalService.open(ClientFormModal, {
    title: "Novo Cliente",
    size: "sm",
  });
  if (result) await load();
};

const handleCheckProjects = async (client: ClientRow) => {
  // Ensure projects are loaded
  if (!projectsStore.rows.length) await projectsStore.list();

  const clientProjects = projectsStore.rows.filter(
    (p) => p?.clientId === client.id,
  );

  await ModalService.open(ProjectsTableModal, {
    title: `Projetos de ${client.name}`,
    size: "xl",
    data: {
      projects: clientProjects,
    },
  });
};

const handleEdit = (client: ClientRow) => {
  ModalService.open(ClientFormModal, {
    title: `Editar Cliente: ${client.name}`,
    size: "sm",
    data: { client },
  }).then((result) => {
    if (result) load();
  });
};

const handleDelete = async (client: ClientRow) => {
  const confirmed = await AlertService.confirm(
    "Excluir Cliente",
    `Tem certeza que deseja excluir \"${client.name}\"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await ApiClientService.clients.remove(client.id);
    await AlertService.success("Excluído", `"${client.name}" foi excluído.`);
    await load();
  } catch (e) {
    console.error("[DashboardClientsPage] Delete failed:", e);
    await AlertService.error("Erro", "Falha ao excluir cliente.");
  }
};

// Calculate engagement score for WhatsApp (0-100)
const calcWhatsappScore = (client: ClientRow): number => {
  const analytics = client.whatsappAnalytics;
  if (!analytics) return 0;
  const sent = analytics.sent || 0;
  if (sent === 0) return 0;
  const delivered = analytics.delivered || 0;
  const read = analytics.read || 0;
  const replied = analytics.replied || 0;
  // Weighted score: delivered 20%, read 40%, replied 40%
  const deliveryRate = sent > 0 ? (delivered / sent) * 20 : 0;
  const readRate = sent > 0 ? (read / sent) * 40 : 0;
  const replyRate = sent > 0 ? (replied / sent) * 40 : 0;
  return Math.min(100, Math.round(deliveryRate + readRate + replyRate));
};

// Calculate engagement score for Email (0-100)
const calcEmailScore = (client: ClientRow): number => {
  const analytics = client.emailAnalytics;
  if (!analytics) return 0;
  const sent = analytics.sent || 0;
  if (sent === 0) return 0;
  const opened = analytics.opened || 0;
  const clicked = analytics.clicked || 0;
  const replied = analytics.replied || 0;
  // Weighted score: opened 30%, clicked 30%, replied 40%
  const openRate = sent > 0 ? (opened / sent) * 30 : 0;
  const clickRate = sent > 0 ? (clicked / sent) * 30 : 0;
  const replyRate = sent > 0 ? (replied / sent) * 40 : 0;
  return Math.min(100, Math.round(openRate + clickRate + replyRate));
};

// Get project count for a client
const getClientProjectCount = (clientId: string): number => {
  return safeProjects.value.filter((p) => p.clientId === clientId).length;
};

// Engagement Details Modal
const EngagementDetailsModal = defineAsyncComponent(
  () => import("../components/dashboard/EngagementDetailsModal.vue"),
);

const handleShowWhatsappEngagement = async (client: ClientRow) => {
  await ModalService.open(EngagementDetailsModal, {
    title: `Engajamento WhatsApp - ${client.name}`,
    size: "md",
    data: {
      type: "whatsapp",
      client,
      analytics: client.whatsappAnalytics,
      score: calcWhatsappScore(client),
    },
  });
};

const handleShowEmailEngagement = async (client: ClientRow) => {
  await ModalService.open(EngagementDetailsModal, {
    title: `Engajamento E-mail - ${client.name}`,
    size: "md",
    data: {
      type: "email",
      client,
      analytics: client.emailAnalytics,
      score: calcEmailScore(client),
    },
  });
};
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="page-header__content">
        <h1 class="page-title">Meus Clientes</h1>
        <p class="page-subtitle">Gerenciamento de clientes e conexões.</p>
      </div>
    </header>

    <!-- Statistics Dashboard -->
    <ClientStatisticsDashboard
      v-if="!loading && rows && rows.length > 0"
      :clients="safeRows"
      :projects="safeProjects"
      :leads="safeLeads"
      :loading="loading"
      @select-client="handleSelectClientFromHighlights"
    />

    <div v-if="loading" class="p-8 text-center opacity-70">
      Carregando clientes...
    </div>
    <div
      v-else-if="error && (!rows || rows.length === 0)"
      class="p-4 text-red-600 bg-red-50 rounded"
    >
      {{ error }}
    </div>

    <div v-else class="table-container card">
      <div
        v-if="error && rows && rows.length"
        class="mb-4 p-3 text-amber-700 bg-amber-50 rounded"
      >
        Alguns dados podem estar desatualizados. Recarregue para tentar
        novamente.
      </div>
      <table class="data-table" role="table" aria-label="Tabela de clientes">
        <thead>
          <tr role="row">
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'name' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'name'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por nome"
                @click="setSort('name')"
              >
                Nome
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("name")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'company' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'company'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por empresa"
                @click="setSort('company')"
              >
                Empresa
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("company")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'email' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'email'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por email"
                @click="setSort('email')"
              >
                Email
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("email")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'phone' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'phone'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por telefone"
                @click="setSort('phone')"
              >
                Telefone
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("phone")
                }}</span>
              </button>
            </th>
            <th role="columnheader">
              <button
                class="th-button"
                :data-sort-key="TABLE_DATA_ATTRS.SORT_KEY"
                :data-sort-dir="sortKey === 'whatsapp' ? sortDir : 'none'"
                :aria-sort="
                  sortKey === 'whatsapp'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
                aria-label="Ordenar por WhatsApp"
                @click="setSort('whatsapp')"
              >
                WhatsApp
                <span class="th-sort" aria-hidden="true">{{
                  sortIndicator("whatsapp")
                }}</span>
              </button>
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Engajamento WhatsApp"
            >
              Engaj. WhatsApp
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Engajamento Email"
            >
              Engaj. E-mail
            </th>
            <th
              role="columnheader"
              class="text-center"
              aria-label="Projetos do cliente"
            >
              Projetos
            </th>
            <th
              class="text-center"
              role="columnheader"
              aria-label="Ações disponíveis"
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="c in sortedRows" :key="c?.id || 'unknown'">
            <tr
              v-if="c"
              :id="`client-row-${c.id}`"
              class="client-row"
              role="row"
              :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
            >
              <td
                class="name-cell"
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
              >
                <div class="name-cell__content">
                  <button
                    class="btn-expand"
                    :class="{ 'btn-expand--active': expandedClientId === c.id }"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    :data-expanded="expandedClientId === c.id"
                    :aria-expanded="expandedClientId === c.id"
                    :aria-controls="`client-details-${c.id}`"
                    :aria-label="
                      expandedClientId === c.id
                        ? 'Recolher detalhes do cliente'
                        : 'Ver detalhes do cliente'
                    "
                    title="Ver detalhes"
                    @click="toggleClientExpand(c.id)"
                  >
                    {{ expandedClientId === c.id ? "▼" : "▶" }}
                  </button>
                  <router-link
                    :to="{ name: 'ClientProfile', params: { id: c.id } }"
                    class="client-link"
                  >
                    {{ c.name }}
                  </router-link>
                </div>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.company || 'Empresa não informada'"
              >
                {{ c.company || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.email || 'Email não informado'"
              >
                {{ c.email || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :title="c.phone || 'Telefone não informado'"
              >
                {{ c.phone || "—" }}
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                :class="{ 'has-whatsapp': c.hasWhatsapp }"
              >
                <div class="whatsapp-cell">
                  <a
                    v-if="c.whatsappNumber || (c.hasWhatsapp && c.cellPhone)"
                    :href="`https://wa.me/55${(c.whatsappNumber || c.cellPhone || '').replace(/\D/g, '')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="whatsapp-link"
                    :title="`Abrir WhatsApp: ${c.whatsappNumber || c.cellPhone}`"
                    :data-whatsapp-number="CLIENT_DATA_ATTRS.WHATSAPP_NUMBER"
                    :data-is-primary="CLIENT_DATA_ATTRS.IS_PRIMARY"
                  >
                    <span class="whatsapp-icon" aria-hidden="true">💬</span>
                    <span class="whatsapp-number">{{
                      c.whatsappNumber || c.cellPhone || "—"
                    }}</span>
                    <span
                      v-if="c.preferredContact === 'whatsapp'"
                      class="primary-badge"
                      title="Meio de contato preferido"
                      aria-label="Contato preferido"
                      >⭐</span
                    >
                  </a>
                  <span v-else class="no-whatsapp">—</span>
                </div>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--whatsapp"
                  :class="{
                    'score-chip--low': calcWhatsappScore(c) < 30,
                    'score-chip--medium':
                      calcWhatsappScore(c) >= 30 && calcWhatsappScore(c) < 60,
                    'score-chip--high': calcWhatsappScore(c) >= 60,
                  }"
                  :title="`Ver detalhes de engajamento WhatsApp (Score: ${calcWhatsappScore(c)}%)`"
                  @click="handleShowWhatsappEngagement(c)"
                >
                  <span class="score-chip__icon">💬</span>
                  <span class="score-chip__value"
                    >{{ calcWhatsappScore(c) }}%</span
                  >
                </button>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--email"
                  :class="{
                    'score-chip--low': calcEmailScore(c) < 30,
                    'score-chip--medium':
                      calcEmailScore(c) >= 30 && calcEmailScore(c) < 60,
                    'score-chip--high': calcEmailScore(c) >= 60,
                  }"
                  :title="`Ver detalhes de engajamento E-mail (Score: ${calcEmailScore(c)}%)`"
                  @click="handleShowEmailEngagement(c)"
                >
                  <span class="score-chip__icon">📧</span>
                  <span class="score-chip__value"
                    >{{ calcEmailScore(c) }}%</span
                  >
                </button>
              </td>
              <td
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
                class="text-center"
              >
                <button
                  class="score-chip score-chip--projects"
                  :class="{
                    'score-chip--none': getClientProjectCount(c.id) === 0,
                    'score-chip--some': getClientProjectCount(c.id) > 0,
                  }"
                  :title="`Ver ${getClientProjectCount(c.id)} projeto(s) do cliente`"
                  @click="handleCheckProjects(c)"
                >
                  <span class="score-chip__icon">📁</span>
                  <span class="score-chip__value">{{
                    getClientProjectCount(c.id)
                  }}</span>
                </button>
              </td>
              <td
                class="text-center"
                role="cell"
                :data-column="TABLE_DATA_ATTRS.COLUMN"
              >
                <div class="client-actions">
                  <button
                    class="btn btn-sm btn-ghost"
                    :data-action="TEST_DATA_ATTRS.ACTION"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    title="Editar cliente"
                    aria-label="Editar cliente"
                    @click="handleEdit(c)"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    :data-action="TEST_DATA_ATTRS.ACTION"
                    :data-client-id="CLIENT_DATA_ATTRS.CLIENT_ID"
                    title="Excluir cliente"
                    aria-label="Excluir cliente"
                    @click="handleDelete(c)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
            <tr
              v-if="c && expandedClientId === c.id"
              class="detail-row"
              :data-detail-for="c.id"
            >
              <td colspan="9" :id="`client-details-${c.id}`" role="cell">
                <ClientDetailView
                  :client="c"
                  :projects="safeProjects"
                  :leads="safeLeads"
                  @close="toggleClientExpand(c.id)"
                />
              </td>
            </tr>
          </template>
          <tr v-if="rows && rows.length === 0" role="row">
            <td colspan="9" class="text-center py-8 opacity-60" role="cell">
              Nenhum cliente encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="page-footer">
      <button class="btn btn-sm btn-primary" @click="openCreateClient">
        <span class="btn-icon">+</span>
        Novo Cliente
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-1);
}

.page-subtitle {
  color: var(--text-2);
  font-size: 0.875rem;
}

.table-container {
  overflow: auto;
  max-width: 100%;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb, #94a3b8)
    var(--scrollbar-track, #e2e8f0);
}

:deep(.table-container::-webkit-scrollbar) {
  height: 8px;
}

:deep(.table-container::-webkit-scrollbar-track) {
  background: var(--scrollbar-track, #e2e8f0);
  border-radius: 999px;
}

:deep(.table-container::-webkit-scrollbar-thumb) {
  background: var(--scrollbar-thumb, #94a3b8);
  border-radius: 999px;
}

:deep(.table-container::-webkit-scrollbar-thumb:hover) {
  background: var(--scrollbar-thumb-hover, #64748b);
}

@media (prefers-color-scheme: dark) {
  .table-container {
    scrollbar-color: var(--scrollbar-thumb, #475569)
      var(--scrollbar-track, #0f172a);
  }

  :deep(.table-container::-webkit-scrollbar-track) {
    background: var(--scrollbar-track, #0f172a);
  }

  :deep(.table-container::-webkit-scrollbar-thumb) {
    background: var(--scrollbar-thumb, #475569);
  }

  :deep(.table-container::-webkit-scrollbar-thumb:hover) {
    background: var(--scrollbar-thumb-hover, #64748b);
  }
}

.data-table {
  width: 100%;
  min-width: 1250px;
  border-collapse: collapse;
  table-layout: auto;
  background: white;
}

@media (prefers-color-scheme: dark) {
  .data-table {
    background: #0f172a;
  }
}

.data-table th,
.data-table td {
  padding: 0.75rem 0.875rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
  color: #0f172a;
}

@media (prefers-color-scheme: dark) {
  .data-table th,
  .data-table td {
    border-bottom-color: #1e293b;
    color: #e2e8f0;
  }
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .data-table th {
    background: #0f172a;
    color: #94a3b8;
  }
}

.data-table th:nth-child(1),
.data-table td:nth-child(1) {
  width: 18%;
  min-width: 180px;
}

.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  width: 12%;
  min-width: 120px;
}

.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 16%;
  min-width: 160px;
}

.data-table th:nth-child(4),
.data-table td:nth-child(4) {
  width: 11%;
  min-width: 120px;
}

.data-table th:nth-child(5),
.data-table td:nth-child(5) {
  width: 13%;
  min-width: 130px;
}

.data-table th:nth-child(6),
.data-table td:nth-child(6) {
  width: 10%;
  min-width: 100px;
  text-align: center;
}

.data-table th:nth-child(7),
.data-table td:nth-child(7) {
  width: 10%;
  min-width: 100px;
  text-align: center;
}

.data-table th:nth-child(8),
.data-table td:nth-child(8) {
  width: 8%;
  min-width: 80px;
  text-align: center;
}

.data-table th:nth-child(9),
.data-table td:nth-child(9) {
  width: 10%;
  min-width: 100px;
  text-align: center;
}

/* WhatsApp Column Styles */
.whatsapp-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.whatsapp-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 6px;
  color: #166534;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.whatsapp-link:hover {
  background: #bbf7d0;
  border-color: #4ade80;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.2);
}

@media (prefers-color-scheme: dark) {
  .whatsapp-link {
    background: #14532d;
    border-color: #166534;
    color: #86efac;
  }

  .whatsapp-link:hover {
    background: #15803d;
    border-color: #22c55e;
    box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
  }
}

.whatsapp-icon {
  font-size: 1rem;
  line-height: 1;
}

.whatsapp-number {
  font-weight: 500;
}

.primary-badge {
  font-size: 0.75rem;
  line-height: 1;
  background: #fef3c7;
  color: #92400e;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  border: 1px solid #fde047;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .primary-badge {
    background: #713f12;
    color: #fde047;
    border-color: #a16207;
  }
}

.client-link {
  color: #0f172a;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.client-link:hover {
  text-decoration: underline;
  color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .client-link {
    color: #e2e8f0;
  }

  .client-link:hover {
    color: #60a5fa;
  }
}

.no-whatsapp {
  color: #94a3b8;
  font-style: italic;
}

@media (prefers-color-scheme: dark) {
  .no-whatsapp {
    color: #475569;
  }
}

.has-whatsapp {
  background: #f0fdf4;
}

@media (prefers-color-scheme: dark) {
  .has-whatsapp {
    background: #052e16;
  }
}

/* Name cell with expand button */
.name-cell__content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Score Chip Button Styles */
.score-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 20px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.score-chip:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.score-chip__icon {
  font-size: 0.9rem;
}

.score-chip__value {
  font-weight: 700;
}

/* WhatsApp Score Chip */
.score-chip--whatsapp {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.score-chip--whatsapp:hover {
  background: #bbf7d0;
  border-color: #4ade80;
}

@media (prefers-color-scheme: dark) {
  .score-chip--whatsapp {
    background: #14532d;
    border-color: #166534;
    color: #86efac;
  }

  .score-chip--whatsapp:hover {
    background: #15803d;
    border-color: #22c55e;
  }
}

/* Email Score Chip */
.score-chip--email {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
}

.score-chip--email:hover {
  background: #bfdbfe;
  border-color: #60a5fa;
}

@media (prefers-color-scheme: dark) {
  .score-chip--email {
    background: #1e3a5f;
    border-color: #1e40af;
    color: #93c5fd;
  }

  .score-chip--email:hover {
    background: #1e4080;
    border-color: #3b82f6;
  }
}

/* Projects Score Chip */
.score-chip--projects {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.score-chip--projects:hover {
  background: #fde68a;
  border-color: #f59e0b;
}

@media (prefers-color-scheme: dark) {
  .score-chip--projects {
    background: #713f12;
    border-color: #a16207;
    color: #fcd34d;
  }

  .score-chip--projects:hover {
    background: #854d0e;
    border-color: #d97706;
  }
}

/* Score level modifiers */
.score-chip--low {
  opacity: 0.7;
}

.score-chip--medium {
  opacity: 0.85;
}

.score-chip--high {
  opacity: 1;
}

.score-chip--none {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #64748b;
}

@media (prefers-color-scheme: dark) {
  .score-chip--none {
    background: #1e293b;
    border-color: #334155;
    color: #94a3b8;
  }
}

.score-chip--some {
  /* Already styled by --projects */
}

.btn-expand {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #64748b;
  font-size: 0.65rem;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-expand:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-expand--active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

@media (prefers-color-scheme: dark) {
  .btn-expand {
    border-color: #475569;
  }

  .btn-expand:hover {
    background: #334155;
    border-color: #64748b;
  }

  .btn-expand--active {
    background: #60a5fa;
    border-color: #60a5fa;
  }
}

.client-row {
  transition: background 0.2s;
}

.client-row:hover {
  background: #f8fafc;
}

@media (prefers-color-scheme: dark) {
  .client-row:hover {
    background: #1e293b;
  }
}

.detail-row td {
  padding: 0;
  border-bottom: 2px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .detail-row td {
    border-bottom-color: #334155;
  }
}

.th-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}

.th-sort {
  opacity: 0.6;
  font-size: 0.7rem;
}

.client-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.page-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-icon {
  margin-right: 0.5rem;
  font-weight: bold;
}
</style>
