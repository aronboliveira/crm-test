<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploaderEmail: string;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done' | 'blocked';
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
}

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

const showRecentActivity = ref(true);

const mockAttachments = computed<Attachment[]>(() => {
  const clientProjects = props.projects.filter((p) => p.clientId === props.client.id);
  if (clientProjects.length === 0) return [];
  
  return [
    {
      id: `att_${props.client.id}_1`,
      fileName: "contrato_template.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245680,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
    },
    {
      id: `att_${props.client.id}_2`,
      fileName: "proposta_comercial.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 128450,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
    },
    {
      id: `att_${props.client.id}_3`,
      fileName: "especificacao_tecnica.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 89320,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
    },
  ];
});

const mockTasks = computed<Task[]>(() => {
  const clientProjects = props.projects.filter((p) => p.clientId === props.client.id);
  if (clientProjects.length === 0) return [];
  
  return clientProjects.slice(0, 3).map((project, i) => ({
    id: `task_${project.id}_${i}`,
    title: `Tarefa relacionada a ${project.name}`,
    status: (['todo', 'doing', 'done'] as const)[i % 3],
    priority: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
    projectId: project.id,
  }));
});

const toggleRecentActivity = () => {
  showRecentActivity.value = !showRecentActivity.value;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('image')) return '🖼️';
  return '📎';
};

const getTaskStatusLabel = (status: Task['status']): string => {
  const labels = {
    todo: 'A fazer',
    doing: 'Em andamento',
    done: 'Concluída',
    blocked: 'Bloqueada',
  };
  return labels[status];
};

const getTaskStatusColor = (status: Task['status']): string => {
  const colors = {
    todo: 'status-todo',
    doing: 'status-doing',
    done: 'status-done',
    blocked: 'status-blocked',
  };
  return colors[status];
};

const getPriorityLabel = (priority: number): string => {
  const labels = ['', 'Muito baixa', 'Baixa', 'Média', 'Alta', 'Crítica'];
  return labels[priority] || 'Média';
};

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
      <section v-if="client.notes" class="detail-section" data-section="notes">
        <h4 class="section-title" id="section-notes-title">📝 Observações</h4>
        <div class="notes-box" :data-client-id="client.id" role="note">
          <p>{{ client.notes }}</p>
        </div>
      </section>

      <!-- Templates Section -->
      <section
        v-if="mockAttachments.length > 0"
        class="detail-section"
        data-section="templates"
      >
        <h4 class="section-title" id="section-templates-title">
          📎 Meus Templates ({{ mockAttachments.length }})
        </h4>
        <div class="templates-list" role="list">
          <div
            v-for="attachment in mockAttachments"
            :key="attachment.id"
            class="template-item"
            :data-attachment-id="attachment.id"
            :data-file-type="attachment.mimeType"
            role="listitem"
          >
            <div class="template-icon">
              {{ getFileIcon(attachment.mimeType) }}
            </div>
            <div class="template-info">
              <div class="template-header">
                <span
                  class="template-name"
                  :title="`Nome do arquivo: ${attachment.fileName}`"
                >
                  {{ attachment.fileName }}
                </span>
                <span class="template-size">
                  {{ formatFileSize(attachment.sizeBytes) }}
                </span>
              </div>
              <div class="template-meta">
                <span class="template-date" :title="`Anexado em: ${formatDate(attachment.createdAt)}`">
                  {{ formatDate(attachment.createdAt) }}
                </span>
                <span class="template-uploader" :title="`Enviado por: ${attachment.uploaderEmail}`">
                  Por: {{ attachment.uploaderEmail }}
                </span>
              </div>
            </div>
            <div class="template-actions">
              <button
                class="btn-template-action"
                :data-action="'download'"
                :data-file-id="attachment.id"
                title="Baixar template"
                aria-label="Baixar template"
              >
                ⬇️
              </button>
              <button
                class="btn-template-action"
                :data-action="'preview'"
                :data-file-id="attachment.id"
                title="Visualizar template"
                aria-label="Visualizar template"
              >
                👁️
              </button>
            </div>
          </div>
        </div>
        <button
          class="btn-add-template"
          data-action="add-template"
          :data-client-id="client.id"
          title="Adicionar novo template"
        >
          <span class="btn-icon">+</span>
          Adicionar Template
        </button>
      </section>

      <!-- Recent Activity Section (Collapsible) -->
      <section
        v-if="mockTasks.length > 0 || clientProjects.length > 0"
        class="detail-section"
        data-section="recent-activity"
      >
        <div class="section-header-collapsible">
          <h4 class="section-title" id="section-activity-title">
            🕐 Atividade Recente
          </h4>
          <button
            class="btn-toggle-section"
            :class="{ 'btn-toggle-section--active': showRecentActivity }"
            :data-expanded="showRecentActivity"
            :aria-expanded="showRecentActivity"
            aria-controls="recent-activity-content"
            :title="showRecentActivity ? 'Recolher seção' : 'Expandir seção'"
            @click="toggleRecentActivity"
          >
            {{ showRecentActivity ? '▼' : '▶' }}
          </button>
        </div>

        <Transition name="slide-fade">
          <div
            v-if="showRecentActivity"
            id="recent-activity-content"
            class="activity-content"
            role="region"
            aria-labelledby="section-activity-title"
          >
            <!-- Recent Tasks -->
            <div
              v-if="mockTasks.length > 0"
              class="activity-subsection"
              data-subsection="tasks"
            >
              <h5 class="subsection-title">Últimas Tarefas</h5>
              <div class="tasks-list" role="list">
                <div
                  v-for="task in mockTasks"
                  :key="task.id"
                  class="task-item"
                  :data-task-id="task.id"
                  :data-task-status="task.status"
                  :data-task-priority="task.priority"
                  role="listitem"
                >
                  <div class="task-status-indicator" :class="getTaskStatusColor(task.status)"></div>
                  <div class="task-content">
                    <div class="task-header">
                      <span class="task-title" :title="`Tarefa: ${task.title}`">
                        {{ task.title }}
                      </span>
                      <span
                        class="task-badge"
                        :class="getTaskStatusColor(task.status)"
                        :title="`Status: ${getTaskStatusLabel(task.status)}`"
                      >
                        {{ getTaskStatusLabel(task.status) }}
                      </span>
                    </div>
                    <div class="task-meta">
                      <span class="task-priority" :title="`Prioridade: ${getPriorityLabel(task.priority)}`">
                        Prioridade: {{ getPriorityLabel(task.priority) }}
                      </span>
                      <span class="task-date" :title="`Atualizado: ${formatDate(task.updatedAt)}`">
                        {{ formatDate(task.updatedAt) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Projects Activity -->
            <div
              v-if="clientProjects.length > 0"
              class="activity-subsection"
              data-subsection="projects"
            >
              <h5 class="subsection-title">Projetos em Andamento</h5>
              <div class="projects-activity-list" role="list">
                <div
                  v-for="project in clientProjects.slice(0, 3)"
                  :key="project.id"
                  class="project-activity-item"
                  :data-project-id="project.id"
                  :data-project-status="project.status"
                  role="listitem"
                >
                  <span class="project-activity-name" :title="`Projeto: ${project.name}`">
                    {{ project.name }}
                  </span>
                  <span
                    v-if="project.status"
                    class="project-activity-status"
                    :class="`status-${project.status}`"
                    :title="`Status: ${project.status}`"
                  >
                    {{ project.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
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

/* Templates Section */
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

@media (prefers-color-scheme: dark) {
  .template-item {
    background: #1e293b;
    border-color: #334155;
  }

  .template-item:hover {
    border-color: #60a5fa;
    box-shadow: 0 2px 8px rgba(96, 165, 250, 0.1);
  }
}

.template-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.template-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-size {
  font-size: 0.75rem;
  color: var(--text-2);
  flex-shrink: 0;
}

.template-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-2);
}

.template-date,
.template-uploader {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.btn-template-action {
  background: transparent;
  border: 1px solid #e2e8f0;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-template-action:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .btn-template-action {
    border-color: #475569;
  }

  .btn-template-action:hover {
    background: #334155;
    border-color: #60a5fa;
  }
}

.btn-add-template {
  margin-top: 0.5rem;
  padding: 0.625rem 1rem;
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #3b82f6;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-add-template:hover {
  background: #3b82f6;
  color: white;
}

@media (prefers-color-scheme: dark) {
  .btn-add-template {
    background: #1e3a8a;
    border-color: #60a5fa;
    color: #93c5fd;
  }

  .btn-add-template:hover {
    background: #60a5fa;
    color: white;
  }
}

.btn-add-template .btn-icon {
  font-size: 1.125rem;
  font-weight: 700;
}

/* Recent Activity Section */
.section-header-collapsible {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-toggle-section {
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

.btn-toggle-section:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-toggle-section--active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

@media (prefers-color-scheme: dark) {
  .btn-toggle-section {
    border-color: #475569;
  }

  .btn-toggle-section:hover {
    background: #334155;
    border-color: #64748b;
  }

  .btn-toggle-section--active {
    background: #60a5fa;
    border-color: #60a5fa;
  }
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-subsection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subsection-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-2);
  margin: 0;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .task-item {
    background: #1e293b;
    border-color: #334155;
  }
}

.task-status-indicator {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.task-title {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.task-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-2);
}

.status-todo {
  background: #fef3c7;
  color: #f59e0b;
}

.status-doing {
  background: #dbeafe;
  color: #3b82f6;
}

.status-done {
  background: #dcfce7;
  color: #16a34a;
}

.status-blocked {
  background: #fee2e2;
  color: #ef4444;
}

@media (prefers-color-scheme: dark) {
  .status-todo {
    background: #78350f;
    color: #fcd34d;
  }

  .task-status-indicator.status-todo {
    background: #f59e0b;
  }

  .status-doing {
    background: #1e3a8a;
    color: #93c5fd;
  }

  .task-status-indicator.status-doing {
    background: #3b82f6;
  }

  .status-done {
    background: #14532d;
    color: #86efac;
  }

  .task-status-indicator.status-done {
    background: #16a34a;
  }

  .status-blocked {
    background: #7f1d1d;
    color: #fca5a5;
  }

  .task-status-indicator.status-blocked {
    background: #ef4444;
  }
}

.projects-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  .project-activity-item {
    background: #1e293b;
    border-color: #334155;
  }
}

.project-activity-name {
  font-size: 0.875rem;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-activity-status {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

/* Slide-fade transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
