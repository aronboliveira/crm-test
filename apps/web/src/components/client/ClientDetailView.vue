<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClientRow } from "../../pinia/types/clients.types";
import type { ProjectRow } from "../../pinia/types/projects.types";
import type { LeadRow } from "../../pinia/types/leads.types";
import BarChart from "../charts/BarChart.vue";
import TemplateCreationModal from "../modal/TemplateCreationModal.vue";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploaderEmail: string;
  templateContent?: string;
  isEmailTemplate?: boolean;
}

interface Task {
  id: string;
  title: string;
  status: "todo" | "doing" | "done" | "blocked";
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
}

interface MessageAnalytics {
  sent?: number;
  delivered?: number;
  read?: number;
  replied?: number;
  lastAt?: string;
  opened?: number;
  clicked?: number;
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
const showTemplateModal = ref(false);

/**
 * Open template creation modal
 */
const openTemplateModal = () => {
  showTemplateModal.value = true;
};

/**
 * Close template creation modal
 */
const closeTemplateModal = () => {
  showTemplateModal.value = false;
};

/**
 * Handle template form submission
 */
const handleTemplateSubmit = async (data: {
  key: string;
  name: string;
  description: string;
  subject: string;
  content: string;
  category: string;
}) => {
  // In a real app, this would call the API
  console.log("Template submission:", data);

  // Simulate API call
  // const response = await fetch('/api/project-templates', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });

  // Close modal after successful submission
  closeTemplateModal();
};

const mockAttachments = computed<Attachment[]>(() => {
  const clientProjects = props.projects.filter(
    (p) => p.clientId === props.client.id,
  );
  if (clientProjects.length === 0) return [];

  // Base64 encoded email template contents (minified)
  const templates = {
    proposta: btoa(
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">Proposta Comercial</h2><p>Prezado(a) ${props.client.name},</p><p>Seguem os detalhes da nossa proposta para ${props.client.company || "sua empresa"}:</p><ul><li>Escopo do projeto</li><li>Cronograma estimado</li><li>Investimento</li></ul><p>Ficamos à disposição para esclarecer dúvidas.</p><p>Atenciosamente,<br>Equipe Comercial</p></div>`,
    ),
    contrato: btoa(
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">Minuta de Contrato</h2><p>Prezado(a) ${props.client.name},</p><p>Segue em anexo a minuta do contrato para ${props.client.company || "sua empresa"}.</p><p>Solicitamos a gentileza de revisar os termos e condições.</p><p>Pontos principais:</p><ul><li>Prazo de execução</li><li>Condições de pagamento</li><li>Garantias e SLA</li></ul><p>Aguardamos retorno.</p><p>Atenciosamente,<br>Departamento Jurídico</p></div>`,
    ),
    followup: btoa(
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">Acompanhamento - ${props.client.company || props.client.name}</h2><p>Olá ${props.client.name},</p><p>Gostaria de fazer um follow-up sobre nossos projetos em andamento.</p><p>Podemos agendar uma reunião para discutir:</p><ul><li>Status atual dos projetos</li><li>Próximos passos</li><li>Feedback e ajustes necessários</li></ul><p>Por favor, me informe sua disponibilidade.</p><p>Cordialmente,<br>Gerente de Projetos</p></div>`,
    ),
  };

  return [
    {
      id: `att_${props.client.id}_1`,
      fileName: "proposta_comercial.eml",
      mimeType: "message/rfc822",
      sizeBytes: 2456,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
      templateContent: templates.proposta,
      isEmailTemplate: true,
    },
    {
      id: `att_${props.client.id}_2`,
      fileName: "contrato_template.eml",
      mimeType: "message/rfc822",
      sizeBytes: 1895,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
      templateContent: templates.contrato,
      isEmailTemplate: true,
    },
    {
      id: `att_${props.client.id}_3`,
      fileName: "followup_projeto.eml",
      mimeType: "message/rfc822",
      sizeBytes: 1678,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      uploaderEmail: props.client.email || "admin@system.com",
      templateContent: templates.followup,
      isEmailTemplate: true,
    },
  ];
});

const mockTasks = computed<Task[]>(() => {
  const clientProjects = props.projects.filter(
    (p) => p.clientId === props.client.id,
  );
  if (clientProjects.length === 0) return [];

  return clientProjects.slice(0, 3).map((project, i) => ({
    id: `task_${project.id}_${i}`,
    title: `Tarefa relacionada a ${project.name}`,
    status: (["todo", "doing", "done"] as const)[i % 3],
    priority: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    createdAt: new Date(
      Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
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
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("rfc822") || mimeType.includes("eml")) return "📧";
  return "📎";
};

// Minified email template utilities
const e = (s: string) => encodeURIComponent(s); // URL encode
const d = (b: string) => {
  try {
    return atob(b);
  } catch {
    return "";
  }
}; // Base64 decode
const s = (h: string) =>
  h
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim(); // Strip HTML (minified)

const generateMailtoLink = (attachment: Attachment): string => {
  if (!attachment.isEmailTemplate || !attachment.templateContent) {
    return "#";
  }

  const clientEmail = props.client.email || "";
  const subject = e(
    attachment.fileName
      .replace(/\.eml$/i, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  );

  // Decode base64 and strip HTML for plain text body
  const decodedHtml = d(attachment.templateContent);
  const plainTextBody = s(decodedHtml);
  const body = e(plainTextBody);

  // Build mailto with query params secured by data attributes
  return `mailto:${clientEmail}?subject=${subject}&body=${body}`;
};

const getTemplateSecurityAttrs = (attachment: Attachment) => {
  return {
    "data-template-id": attachment.id,
    "data-client-ref": props.client.id,
    "data-template-type": attachment.isEmailTemplate ? "email" : "file",
    "data-secure-hash": btoa(
      `${attachment.id}:${props.client.id}:${attachment.fileName}`,
    ).substring(0, 16),
  };
};

const getTaskStatusLabel = (status: Task["status"]): string => {
  const labels = {
    todo: "A fazer",
    doing: "Em andamento",
    done: "Concluída",
    blocked: "Bloqueada",
  };
  return labels[status];
};

const getTaskStatusColor = (status: Task["status"]): string => {
  const colors = {
    todo: "status-todo",
    doing: "status-doing",
    done: "status-done",
    blocked: "status-blocked",
  };
  return colors[status];
};

const getPriorityLabel = (priority: number): string => {
  const labels = ["", "Muito baixa", "Baixa", "Média", "Alta", "Crítica"];
  return labels[priority] || "Média";
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

const whatsappAnalytics = computed<MessageAnalytics>(() => ({
  sent: props.client.whatsappAnalytics?.sent ?? 0,
  delivered: props.client.whatsappAnalytics?.delivered ?? 0,
  read: props.client.whatsappAnalytics?.read ?? 0,
  replied: props.client.whatsappAnalytics?.replied ?? 0,
  lastAt: props.client.whatsappAnalytics?.lastMessageAt,
}));

const emailAnalytics = computed<MessageAnalytics>(() => ({
  sent: props.client.emailAnalytics?.sent ?? 0,
  opened: props.client.emailAnalytics?.opened ?? 0,
  clicked: props.client.emailAnalytics?.clicked ?? 0,
  replied: props.client.emailAnalytics?.replied ?? 0,
  lastAt: props.client.emailAnalytics?.lastEmailAt,
}));

const whatsappReplyRate = computed(() => {
  const sent = whatsappAnalytics.value.sent ?? 0;
  const replied = whatsappAnalytics.value.replied ?? 0;
  return sent > 0 ? Math.round((replied / sent) * 100) : 0;
});

const emailReplyRate = computed(() => {
  const sent = emailAnalytics.value.sent ?? 0;
  const replied = emailAnalytics.value.replied ?? 0;
  return sent > 0 ? Math.round((replied / sent) * 100) : 0;
});

const whatsappDeliveryRate = computed(() => {
  const sent = whatsappAnalytics.value.sent ?? 0;
  const delivered = whatsappAnalytics.value.delivered ?? 0;
  return sent > 0 ? Math.round((delivered / sent) * 100) : 0;
});

const whatsappReadRate = computed(() => {
  const sent = whatsappAnalytics.value.sent ?? 0;
  const read = whatsappAnalytics.value.read ?? 0;
  return sent > 0 ? Math.round((read / sent) * 100) : 0;
});

const emailOpenRate = computed(() => {
  const sent = emailAnalytics.value.sent ?? 0;
  const opened = emailAnalytics.value.opened ?? 0;
  return sent > 0 ? Math.round((opened / sent) * 100) : 0;
});

const emailClickRate = computed(() => {
  const opened = emailAnalytics.value.opened ?? 0;
  const clicked = emailAnalytics.value.clicked ?? 0;
  return opened > 0 ? Math.round((clicked / opened) * 100) : 0;
});

const engagementScore = computed(() => {
  const whatsappScore =
    whatsappReadRate.value * 0.4 + whatsappReplyRate.value * 0.6;
  const emailScore = emailOpenRate.value * 0.4 + emailReplyRate.value * 0.6;
  return Math.round((whatsappScore + emailScore) / 2);
});

const trendMonths = computed(() => {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const label = formatter.format(date);
    return label.replace(".", "").toUpperCase();
  });
});

const buildTrendSeries = (total: number, months: number) => {
  const safeTotal = Math.max(0, total || 0);
  const base = Math.floor(safeTotal / months);
  const remainder = safeTotal - base * months;
  return Array.from(
    { length: months },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
};

const whatsappTrendBars = computed(() => {
  const series = buildTrendSeries(whatsappAnalytics.value.sent ?? 0, 6);
  return series.map((value, index) => ({
    label: trendMonths.value[index] || "",
    value,
    color: "#22c55e",
  }));
});

const emailTrendBars = computed(() => {
  const series = buildTrendSeries(emailAnalytics.value.sent ?? 0, 6);
  return series.map((value, index) => ({
    label: trendMonths.value[index] || "",
    value,
    color: "#3b82f6",
  }));
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
            <span
              v-if="client.preferredContact === 'email'"
              class="preferred-badge"
              title="Meio de contato preferido"
              >⭐ Preferido</span
            >
          </div>
          <div v-if="client.phone" class="info-item">
            <span class="info-label">Telefone:</span>
            <a :href="`tel:${client.phone}`" class="info-value info-link">
              {{ client.phone }}
            </a>
            <span
              v-if="client.preferredContact === 'phone'"
              class="preferred-badge"
              title="Meio de contato preferido"
              >⭐ Preferido</span
            >
          </div>
          <div v-if="client.cellPhone" class="info-item">
            <span class="info-label">Celular:</span>
            <a :href="`tel:${client.cellPhone}`" class="info-value info-link">
              {{ client.cellPhone }}
            </a>
            <span
              v-if="client.preferredContact === 'cellphone'"
              class="preferred-badge"
              title="Meio de contato preferido"
              >⭐ Preferido</span
            >
          </div>
          <div
            v-if="
              client.whatsappNumber || (client.hasWhatsapp && client.cellPhone)
            "
            class="info-item whatsapp-info"
          >
            <span class="info-label">WhatsApp:</span>
            <a
              :href="`https://wa.me/55${(client.whatsappNumber || client.cellPhone || '').replace(/\D/g, '')}`"
              target="_blank"
              rel="noopener noreferrer"
              class="info-value info-link whatsapp-link-detail"
            >
              <span class="whatsapp-icon-detail" aria-hidden="true">💬</span>
              {{ client.whatsappNumber || client.cellPhone }}
            </a>
            <span
              v-if="client.preferredContact === 'whatsapp'"
              class="preferred-badge"
              title="Meio de contato preferido"
              >⭐ Preferido</span
            >
            <span
              v-if="client.hasWhatsapp"
              class="whatsapp-verified"
              title="WhatsApp verificado"
            >
              ✓ Verificado
            </span>
          </div>
          <div
            v-if="
              !client.email &&
              !client.phone &&
              !client.cellPhone &&
              !client.whatsappNumber
            "
            class="info-empty"
          >
            Nenhuma informação de contato disponível
          </div>
        </div>
      </section>

      <!-- Messaging Analytics -->
      <section class="detail-section">
        <h4 class="section-title">📨 Mensagens & Engajamento</h4>
        <div class="analytics-grid">
          <div class="analytics-card analytics-card--whatsapp">
            <div class="analytics-header">
              <span class="analytics-icon">💬</span>
              <div>
                <h5 class="analytics-title">WhatsApp</h5>
                <p class="analytics-subtitle">Último contato</p>
              </div>
              <span class="analytics-score" title="Engajamento do cliente">
                {{ engagementScore }}%
              </span>
            </div>
            <div class="analytics-metrics">
              <div class="metric">
                <span class="metric-label">Enviadas</span>
                <span class="metric-value">{{ whatsappAnalytics.sent }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Lidas</span>
                <span class="metric-value">{{ whatsappAnalytics.read }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Respondidas</span>
                <span class="metric-value">{{
                  whatsappAnalytics.replied
                }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Taxa de resposta</span>
                <span class="metric-value">{{ whatsappReplyRate }}%</span>
              </div>
            </div>
            <div class="analytics-badges">
              <span class="analytics-badge"
                >Entregues {{ whatsappDeliveryRate }}%</span
              >
              <span class="analytics-badge"
                >Leitura {{ whatsappReadRate }}%</span
              >
            </div>
            <div class="analytics-footer">
              <span v-if="whatsappAnalytics.lastAt" class="analytics-last">
                {{ formatDate(whatsappAnalytics.lastAt) }}
              </span>
              <span v-else class="analytics-empty">Sem mensagens recentes</span>
            </div>
          </div>

          <div class="analytics-card analytics-card--email">
            <div class="analytics-header">
              <span class="analytics-icon">✉️</span>
              <div>
                <h5 class="analytics-title">E-mail</h5>
                <p class="analytics-subtitle">Último envio</p>
              </div>
              <span class="analytics-score" title="Engajamento do cliente">
                {{ engagementScore }}%
              </span>
            </div>
            <div class="analytics-metrics">
              <div class="metric">
                <span class="metric-label">Enviados</span>
                <span class="metric-value">{{ emailAnalytics.sent }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Abertos</span>
                <span class="metric-value">{{ emailAnalytics.opened }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Cliques</span>
                <span class="metric-value">{{ emailAnalytics.clicked }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Taxa de resposta</span>
                <span class="metric-value">{{ emailReplyRate }}%</span>
              </div>
            </div>
            <div class="analytics-badges">
              <span class="analytics-badge">Abertura {{ emailOpenRate }}%</span>
              <span class="analytics-badge">Clique {{ emailClickRate }}%</span>
            </div>
            <div class="analytics-footer">
              <span v-if="emailAnalytics.lastAt" class="analytics-last">
                {{ formatDate(emailAnalytics.lastAt) }}
              </span>
              <span v-else class="analytics-empty">Sem envios recentes</span>
            </div>
          </div>
        </div>
        <div class="analytics-trends">
          <div class="trend-card">
            <div class="trend-header">
              <span class="trend-icon">💬</span>
              <div>
                <h5 class="trend-title">Tendência WhatsApp</h5>
                <p class="trend-subtitle">Últimos 6 meses</p>
              </div>
            </div>
            <BarChart
              :bars="whatsappTrendBars"
              :height="140"
              :show-values="false"
              :show-axis-labels="false"
              :max-bar-width="28"
            />
          </div>
          <div class="trend-card">
            <div class="trend-header">
              <span class="trend-icon">✉️</span>
              <div>
                <h5 class="trend-title">Tendência E-mail</h5>
                <p class="trend-subtitle">Últimos 6 meses</p>
              </div>
            </div>
            <BarChart
              :bars="emailTrendBars"
              :height="140"
              :show-values="false"
              :show-axis-labels="false"
              :max-bar-width="28"
            />
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
                <span
                  class="template-date"
                  :title="`Anexado em: ${formatDate(attachment.createdAt)}`"
                >
                  {{ formatDate(attachment.createdAt) }}
                </span>
                <span
                  class="template-uploader"
                  :title="`Enviado por: ${attachment.uploaderEmail}`"
                >
                  Por: {{ attachment.uploaderEmail }}
                </span>
              </div>
            </div>
            <div class="template-actions">
              <a
                v-if="attachment.isEmailTemplate"
                :href="generateMailtoLink(attachment)"
                class="btn-template-action btn-template-email"
                :id="`email-template-${attachment.id}`"
                v-bind="getTemplateSecurityAttrs(attachment)"
                :title="`Abrir email com template: ${attachment.fileName.replace('.eml', '')}`"
                :aria-label="`Abrir cliente de email com template ${attachment.fileName.replace('.eml', '')}`"
                rel="noopener noreferrer"
                data-action="email-template"
              >
                ✉️
              </a>
              <button
                v-else
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
          @click="openTemplateModal"
        >
          <span class="btn-icon">+</span>
          Adicionar Template
        </button>
      </section>

      <!-- Template Creation Modal -->
      <TemplateCreationModal
        :is-open="showTemplateModal"
        :client-id="client.id"
        :client-name="client.name"
        @close="closeTemplateModal"
        @submit="handleTemplateSubmit"
      />

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
            {{ showRecentActivity ? "▼" : "▶" }}
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
                  <div
                    class="task-status-indicator"
                    :class="getTaskStatusColor(task.status)"
                  ></div>
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
                      <span
                        class="task-priority"
                        :title="`Prioridade: ${getPriorityLabel(task.priority)}`"
                      >
                        Prioridade: {{ getPriorityLabel(task.priority) }}
                      </span>
                      <span
                        class="task-date"
                        :title="`Atualizado: ${formatDate(task.updatedAt)}`"
                      >
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
                  <span
                    class="project-activity-name"
                    :title="`Projeto: ${project.name}`"
                  >
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
  flex-wrap: wrap;
  align-items: center;
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

/* WhatsApp Styles */
.whatsapp-info {
  background: #f0fdf4;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #86efac;
}

.whatsapp-link-detail {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 6px;
  color: #166534;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.whatsapp-link-detail:hover {
  background: #bbf7d0;
  border-color: #4ade80;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  text-decoration: none;
}

.whatsapp-icon-detail {
  font-size: 1.25rem;
  line-height: 1;
}

.preferred-badge {
  font-size: 0.75rem;
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #fde047;
  font-weight: 600;
  margin-left: 0.5rem;
}

.whatsapp-verified {
  font-size: 0.75rem;
  background: #dcfce7;
  color: #166534;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #86efac;
  font-weight: 600;
  margin-left: 0.5rem;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.analytics-card {
  border: 1px solid var(--border-1);
  border-radius: 12px;
  padding: 1rem;
  background: var(--surface-1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analytics-card--whatsapp {
  border-color: #86efac;
  background: #f0fdf4;
}

.analytics-card--email {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.analytics-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.analytics-score {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-1);
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.analytics-icon {
  font-size: 1.5rem;
}

.analytics-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-1);
}

.analytics-subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-2);
}

.analytics-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 0.75rem;
}

.analytics-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.analytics-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  border: 1px solid var(--border-1);
}

.analytics-trends {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.trend-card {
  border: 1px solid var(--border-1);
  border-radius: 12px;
  padding: 1rem;
  background: var(--surface-1);
}

.trend-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.trend-icon {
  font-size: 1.25rem;
}

.trend-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-1);
}

.trend-subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-2);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.metric-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-2);
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-1);
}

.analytics-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-2);
}

.analytics-empty {
  font-style: italic;
  color: var(--text-3);
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
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-template-action:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  transform: scale(1.05);
}

.btn-template-email {
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 600;
}

.btn-template-email:hover {
  background: #dbeafe;
  border-color: #2563eb;
  color: #1e40af;
}

.btn-template-email:active {
  transform: scale(0.98);
}

@media (prefers-color-scheme: dark) {
  .btn-template-action {
    border-color: #475569;
  }

  .btn-template-action:hover {
    background: #334155;
    border-color: #60a5fa;
  }

  .btn-template-email {
    border-color: #60a5fa;
    color: #93c5fd;
  }

  .btn-template-email:hover {
    background: #1e3a8a;
    border-color: #3b82f6;
    color: #bfdbfe;
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
