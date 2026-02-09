<script setup lang="ts">
import { computed } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";

interface Props {
  client: ClientRow;
  projects: ProjectRow[];
  leads?: LeadRow[];
}

const props = withDefaults(defineProps<Props>(), {
  leads: () => [],
});

const emit = defineEmits<{
  close: [];
}>();

const clientProjects = computed(() =>
  props.projects.filter((p) => p.clientId === props.client.id),
);

const clientLeads = computed(() =>
  props.leads.filter(
    (l: any) =>
      l.convertedClientId === props.client.id || l.clientId === props.client.id,
  ),
);

const wonLeads = computed(() =>
  clientLeads.value.filter((l) => l.status === "won"),
);

const lostLeads = computed(() =>
  clientLeads.value.filter((l) => l.status === "lost"),
);

const activeLeads = computed(() =>
  clientLeads.value.filter((l) => !["won", "lost"].includes(l.status || "")),
);

const conversionRate = computed(() => {
  const total = wonLeads.value.length + lostLeads.value.length;
  return total > 0 ? (wonLeads.value.length / total) * 100 : 0;
});

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Data inválida";
  }
};

const daysSinceCreated = computed(() => {
  if (!props.client.createdAt) return null;
  const created = new Date(props.client.createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

const daysSinceUpdated = computed(() => {
  if (!props.client.updatedAt) return null;
  const updated = new Date(props.client.updatedAt);
  const now = new Date();
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});
</script>

<template>
  <div class="client-detail-view">
    <div class="detail-header">
      <div class="header-content">
        <h3 class="client-name">{{ client.name }}</h3>
        <p v-if="client.company" class="client-company">
          🏢 {{ client.company }}
        </p>
      </div>
      <button class="btn-close" title="Fechar" @click="emit('close')">×</button>
    </div>

    <div class="detail-body">
      <!-- Contact Information -->
      <section class="detail-section">
        <h4 class="section-title">📞 Informações de Contato</h4>
        <div class="info-grid">
          <div v-if="client.email" class="info-item">
            <span class="info-label">Email:</span>
            <a :href="`mailto:${client.email}`" class="info-value info-link">
              {{ client.email }}
            </a>
          </div>
          <div v-if="client.phone" class="info-item">
            <span class="info-label">Telefone:</span>
            <a :href="`tel:${client.phone}`" class="info-value info-link">
              {{ client.phone }}
            </a>
          </div>
          <div v-if="!client.email && !client.phone" class="info-empty">
            Nenhuma informação de contato disponível
          </div>
        </div>
      </section>

      <!-- Timeline -->
      <section class="detail-section">
        <h4 class="section-title">📅 Datas Importantes</h4>
        <div class="timeline">
          <div v-if="client.createdAt" class="timeline-item">
            <span class="timeline-label">Cliente desde:</span>
            <span class="timeline-value">
              {{ formatDate(client.createdAt) }}
              <span v-if="daysSinceCreated !== null" class="timeline-ago">
                (há {{ daysSinceCreated }} dias)
              </span>
            </span>
          </div>
          <div v-if="client.updatedAt" class="timeline-item">
            <span class="timeline-label">Última atualização:</span>
            <span class="timeline-value">
              {{ formatDate(client.updatedAt) }}
              <span v-if="daysSinceUpdated !== null" class="timeline-ago">
                (há {{ daysSinceUpdated }} dias)
              </span>
            </span>
          </div>
        </div>
      </section>

      <!-- Projects Summary -->
      <section class="detail-section">
        <h4 class="section-title">📁 Projetos ({{ clientProjects.length }})</h4>
        <div v-if="clientProjects.length > 0" class="projects-list">
          <div
            v-for="project in clientProjects"
            :key="project.id"
            class="project-item"
          >
            <div class="project-header">
              <span class="project-name">{{ project.name }}</span>
              <span
                v-if="project.status"
                class="project-status"
                :class="`status-${project.status}`"
              >
                {{ project.status }}
              </span>
            </div>
            <p v-if="project.description" class="project-description">
              {{ project.description }}
            </p>
          </div>
        </div>
        <div v-else class="info-empty">Nenhum projeto associado</div>
      </section>

      <!-- Leads Summary -->
      <section class="detail-section">
        <h4 class="section-title">🎯 Leads e Conversão</h4>
        <div class="leads-stats">
          <div class="stat-box">
            <span class="stat-value">{{ wonLeads.length }}</span>
            <span class="stat-label">Convertidos</span>
          </div>
          <div class="stat-box">
            <span class="stat-value">{{ activeLeads.length }}</span>
            <span class="stat-label">Em negociação</span>
          </div>
          <div class="stat-box">
            <span class="stat-value">{{ lostLeads.length }}</span>
            <span class="stat-label">Perdidos</span>
          </div>
          <div class="stat-box stat-box--highlight">
            <span class="stat-value">{{ conversionRate.toFixed(0) }}%</span>
            <span class="stat-label">Taxa de conversão</span>
          </div>
        </div>
      </section>

      <!-- Notes -->
      <section v-if="client.notes" class="detail-section">
        <h4 class="section-title">📝 Observações</h4>
        <div class="notes-box">
          <p>{{ client.notes }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.client-detail-view {
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .client-detail-view {
    background: #0f172a;
    border-color: #334155;
  }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .detail-header {
    background: #1e293b;
    border-color: #334155;
  }
}

.header-content {
  flex: 1;
}

.client-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-1);
}

.client-company {
  font-size: 0.875rem;
  color: var(--text-2);
  margin: 0.25rem 0 0 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-2);
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
  color: var(--text-1);
}

@media (prefers-color-scheme: dark) {
  .btn-close:hover {
    background: #334155;
  }
}

.detail-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-1);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.info-label {
  font-weight: 500;
  color: var(--text-2);
  min-width: 80px;
}

.info-value {
  color: var(--text-1);
}

.info-link {
  color: #3b82f6;
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

.info-empty {
  font-size: 0.875rem;
  color: var(--text-2);
  font-style: italic;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  align-items: baseline;
}

.timeline-label {
  font-weight: 500;
  color: var(--text-2);
  min-width: 120px;
}

.timeline-value {
  color: var(--text-1);
}

.timeline-ago {
  color: var(--text-2);
  font-size: 0.8125rem;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-item {
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .project-item {
    background: #1e293b;
    border-color: #334155;
  }
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.project-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-1);
}

.project-status {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-active {
  background: #dcfce7;
  color: #16a34a;
}

.status-pending {
  background: #fef3c7;
  color: #f59e0b;
}

.status-completed {
  background: #dbeafe;
  color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .status-active {
    background: #14532d;
    color: #86efac;
  }

  .status-pending {
    background: #78350f;
    color: #fcd34d;
  }

  .status-completed {
    background: #1e3a8a;
    color: #93c5fd;
  }
}

.project-description {
  font-size: 0.8125rem;
  color: var(--text-2);
  margin: 0;
  line-height: 1.4;
}

.leads-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .stat-box {
    background: #1e293b;
    border-color: #334155;
  }
}

.stat-box--highlight {
  background: #eff6ff;
  border-color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .stat-box--highlight {
    background: #1e3a8a;
    border-color: #60a5fa;
  }
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-1);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-2);
  text-align: center;
}

.notes-box {
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: var(--text-1);
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .notes-box {
    background: #1e293b;
    border-color: #334155;
  }
}

.notes-box p {
  margin: 0;
}
</style>
