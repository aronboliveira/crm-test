<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ClientRow } from "../pinia/types/clients.types";
import type { ProjectRow } from "../pinia/types/projects.types";
import type { LeadRow } from "../pinia/types/leads.types";
import ApiClientService from "../services/ApiClientService";
import { useProjectsStore } from "../pinia/stores/projects.store";
import { useLeadsStore } from "../pinia/stores/leads.store";
import ClientDetailView from "../components/client/ClientDetailView.vue";

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const leadsStore = useLeadsStore();

const loading = ref(true);
const error = ref("");
const client = ref<ClientRow | null>(null);

const clientId = computed(() => String(route.params.id || "").trim());
const safeProjects = computed(
  () => (projectsStore.rows || []).filter(Boolean) as ProjectRow[],
);
const safeLeads = computed(
  () => (leadsStore.rows || []).filter(Boolean) as LeadRow[],
);

const loadClient = async () => {
  if (!clientId.value) {
    error.value = "Cliente inválido.";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    if (!projectsStore.rows.length) await projectsStore.list();
    if (!leadsStore.rows.length) await leadsStore.list();

    const response = await ApiClientService.clients.get(clientId.value);
    client.value = response?.item ?? response;
  } catch (err) {
    console.error("[ClientProfilePage] loadClient failed:", err);
    error.value = "Não foi possível carregar o cliente.";
    client.value = null;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push({ name: "DashboardClients" });
};

onMounted(loadClient);
watch(clientId, () => loadClient());
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="page-header__content">
        <button class="btn btn-sm btn-ghost" @click="goBack">← Voltar</button>
        <div>
          <h1 class="page-title">Perfil do Cliente</h1>
          <p class="page-subtitle">
            {{ client?.name || "Detalhes completos" }}
          </p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="p-8 text-center opacity-70">
      Carregando perfil...
    </div>

    <div v-else-if="error" class="p-4 text-red-600 bg-red-50 rounded">
      {{ error }}
    </div>

    <div v-else-if="client" class="profile-content">
      <ClientDetailView
        :client="client"
        :projects="safeProjects"
        :leads="safeLeads"
      />
    </div>

    <div v-else class="p-4 text-amber-700 bg-amber-50 rounded">
      Cliente não encontrado.
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
  align-items: center;
}

.page-header__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-1);
}

.page-subtitle {
  color: var(--text-2);
  font-size: 0.9rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
}
</style>
