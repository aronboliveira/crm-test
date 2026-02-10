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
import ClientStatisticsDashboard from "../components/dashboard/ClientStatisticsDashboard.vue";
import ClientDetailView from "../components/client/ClientDetailView.vue";

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

const sortKey = ref<"name" | "company" | "email" | "phone">("name");
const sortDir = ref<"asc" | "desc">("asc");

const sortedRows = computed(() => {
  const list = (rows.value || []).filter(Boolean) as ClientRow[];
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
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
      :clients="rows"
      :projects="projectsStore.rows"
      :leads="leadsStore.rows"
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
            <th
              style="width: 40px"
              role="columnheader"
              aria-label="Expandir detalhes"
            ></th>
            <th role="columnheader">
              <button
                class="th-button"
                data-sort-key="name"
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
                data-sort-key="company"
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
                data-sort-key="email"
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
                data-sort-key="phone"
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
            <th
              class="text-right"
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
              :data-client-id="c.id"
            >
              <td role="cell">
                <button
                  class="btn-expand"
                  :class="{ 'btn-expand--active': expandedClientId === c.id }"
                  :data-client-id="c.id"
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
              </td>
              <td class="font-medium" role="cell" data-column="name">
                {{ c.name }}
              </td>
              <td
                role="cell"
                data-column="company"
                :title="c.company || 'Empresa não informada'"
              >
                {{ c.company || "—" }}
              </td>
              <td
                role="cell"
                data-column="email"
                :title="c.email || 'Email não informado'"
              >
                {{ c.email || "—" }}
              </td>
              <td
                role="cell"
                data-column="phone"
                :title="c.phone || 'Telefone não informado'"
              >
                {{ c.phone || "—" }}
              </td>
              <td class="text-right" role="cell" data-column="actions">
                <div class="client-actions">
                  <button
                    class="btn btn-sm btn-ghost"
                    data-action="edit"
                    :data-client-id="c.id"
                    title="Editar cliente"
                    aria-label="Editar cliente"
                    @click="handleEdit(c)"
                  >
                    ✏️
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    data-action="delete"
                    :data-client-id="c.id"
                    title="Excluir cliente"
                    aria-label="Excluir cliente"
                    @click="handleDelete(c)"
                  >
                    🗑️
                  </button>
                  <button
                    class="btn btn-sm btn-outline"
                    data-action="view-projects"
                    :data-client-id="c.id"
                    title="Ver projetos do cliente"
                    aria-label="Ver projetos do cliente"
                    @click="handleCheckProjects(c)"
                  >
                    Projetos
                  </button>
                </div>
              </td>
            </tr>
            <tr
              v-if="c && expandedClientId === c.id"
              class="detail-row"
              :data-detail-for="c.id"
            >
              <td colspan="6" :id="`client-details-${c.id}`" role="cell">
                <ClientDetailView
                  :client="c"
                  :projects="projectsStore.rows"
                  :leads="leadsStore.rows"
                  @close="toggleClientExpand(c.id)"
                />
              </td>
            </tr>
          </template>
          <tr v-if="rows && rows.length === 0" role="row">
            <td colspan="6" class="text-center py-8 opacity-60" role="cell">
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
  overflow-x: auto;
  max-width: 100%;
}

.data-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  table-layout: auto;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-1);
}

.data-table th {
  background: var(--surface-2);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-2);
}

.data-table th:nth-child(1),
.data-table td:nth-child(1) {
  width: 50px;
  min-width: 50px;
}

.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  width: 22%;
  min-width: 150px;
}

.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 22%;
  min-width: 150px;
}

.data-table th:nth-child(4),
.data-table td:nth-child(4) {
  width: 25%;
  min-width: 180px;
}

.data-table th:nth-child(5),
.data-table td:nth-child(5) {
  width: 20%;
  min-width: 120px;
}

.data-table th:nth-child(6),
.data-table td:nth-child(6) {
  width: 11%;
  min-width: 140px;
  text-align: right;
}

.btn-expand {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: var(--text-2);
  font-size: 0.75rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
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
  justify-content: flex-end;
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
