<script setup lang="ts">
import { computed } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";

interface Props {
  isOpen: boolean;
  clients: ClientRow[];
  projects: ProjectRow[];
  leads?: LeadRow[];
}

interface ClientHighlight {
  client: ClientRow;
  score: number;
  reasons: string[];
  projectCount: number;
  recentActivity: boolean;
  conversionRate: number;
}

const props = withDefaults(defineProps<Props>(), {
  leads: () => [],
});

const emit = defineEmits<{
  close: [];
  selectClient: [clientId: string];
}>();

const highlights = computed<ClientHighlight[]>(() => {
  const clientMap = new Map<string, ClientHighlight>();

  props.clients.forEach((client) => {
    const clientProjects = props.projects.filter(
      (p) => p.clientId === client.id,
    );
    const clientLeads = props.leads.filter(
      (l: any) => l.convertedClientId === client.id || l.clientId === client.id,
    );

    const projectCount = clientProjects.length;
    const wonLeads = clientLeads.filter((l) => l.status === "won").length;
    const totalLeads = clientLeads.length;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    const daysSinceUpdate = client.updatedAt
      ? Math.floor(
          (Date.now() - new Date(client.updatedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;
    const recentActivity = daysSinceUpdate <= 7;

    const reasons: string[] = [];
    let score = 0;

    if (projectCount >= 3) {
      reasons.push(`${projectCount} projetos ativos`);
      score += projectCount * 10;
    }

    if (recentActivity) {
      reasons.push("Atividade recente (últimos 7 dias)");
      score += 30;
    }

    if (conversionRate >= 50 && totalLeads > 0) {
      reasons.push(`${conversionRate.toFixed(0)}% taxa de conversão`);
      score += 25;
    }

    if (totalLeads >= 3) {
      reasons.push(`${totalLeads} leads em negociação`);
      score += totalLeads * 5;
    }

    if (client.notes && client.notes.includes("estratégico")) {
      reasons.push("Cliente estratégico identificado");
      score += 20;
    }

    if (score > 0) {
      clientMap.set(client.id, {
        client,
        score,
        reasons,
        projectCount,
        recentActivity,
        conversionRate,
      });
    }
  });

  return Array.from(clientMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
});

const handleClose = () => {
  emit("close");
};

const handleSelectClient = (clientId: string) => {
  emit("selectClient", clientId);
  handleClose();
};

const getScoreBadgeColor = (score: number): string => {
  if (score >= 100) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 30) return "bg-amber-500";
  return "bg-gray-500";
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click="handleClose">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <div>
              <h2 class="modal-title">✨ Destaques de Clientes</h2>
              <p class="modal-subtitle">
                Clientes com maior potencial de negócio identificados
              </p>
            </div>
            <button class="modal-close" title="Fechar" @click="handleClose">
              ×
            </button>
          </div>

          <div class="modal-body">
            <div v-if="highlights.length === 0" class="empty-state">
              <p>Nenhum destaque identificado no momento.</p>
              <p class="empty-hint">
                Continue adicionando projetos e leads para ver destaques aqui.
              </p>
            </div>

            <div v-else class="highlights-list">
              <div
                v-for="(highlight, index) in highlights"
                :key="highlight.client.id"
                class="highlight-card"
              >
                <div class="highlight-rank">
                  <span class="rank-number">{{ index + 1 }}</span>
                </div>

                <div class="highlight-content">
                  <div class="highlight-header">
                    <div>
                      <h3 class="highlight-name">
                        {{ highlight.client.name }}
                      </h3>
                      <p
                        v-if="highlight.client.company"
                        class="highlight-company"
                      >
                        {{ highlight.client.company }}
                      </p>
                    </div>
                    <div
                      class="highlight-score"
                      :class="getScoreBadgeColor(highlight.score)"
                    >
                      {{ highlight.score }} pts
                    </div>
                  </div>

                  <div class="highlight-reasons">
                    <p class="reasons-title">
                      Por que este cliente se destaca:
                    </p>
                    <ul class="reasons-list">
                      <li v-for="(reason, i) in highlight.reasons" :key="i">
                        {{ reason }}
                      </li>
                    </ul>
                  </div>

                  <div class="highlight-actions">
                    <button
                      class="btn btn-sm btn-primary"
                      @click="handleSelectClient(highlight.client.id)"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <p class="footer-note">
              💡 <strong>Dica:</strong> Os destaques são calculados com base em
              projetos ativos, atividade recente, taxa de conversão e notas
              estratégicas.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  .modal-container {
    background: #1e293b;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .modal-header {
    border-color: #334155;
  }
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-1);
}

.modal-subtitle {
  font-size: 0.875rem;
  color: var(--text-2);
  margin: 0.25rem 0 0 0;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-2);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: var(--text-1);
}

@media (prefers-color-scheme: dark) {
  .modal-close:hover {
    background: #334155;
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-2);
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.7;
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.highlight-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.highlight-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

@media (prefers-color-scheme: dark) {
  .highlight-card {
    background: #0f172a;
    border-color: #334155;
  }

  .highlight-card:hover {
    border-color: #60a5fa;
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.1);
  }
}

.highlight-rank {
  flex-shrink: 0;
}

.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
}

.highlight-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.highlight-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.highlight-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-1);
}

.highlight-company {
  font-size: 0.875rem;
  color: var(--text-2);
  margin: 0.25rem 0 0 0;
}

.highlight-score {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.875rem;
  color: white;
  white-space: nowrap;
}

.bg-green-500 {
  background: #16a34a;
}

.bg-blue-500 {
  background: #3b82f6;
}

.bg-amber-500 {
  background: #f59e0b;
}

.bg-gray-500 {
  background: #64748b;
}

.highlight-reasons {
  background: white;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .highlight-reasons {
    background: #1e293b;
    border-color: #334155;
  }
}

.reasons-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--text-2);
}

.reasons-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.reasons-list li {
  font-size: 0.875rem;
  padding-left: 1.25rem;
  position: relative;
  color: var(--text-1);
}

.reasons-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #16a34a;
  font-weight: 700;
}

.highlight-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

@media (prefers-color-scheme: dark) {
  .modal-footer {
    background: #0f172a;
    border-color: #334155;
  }
}

.footer-note {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-2);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
