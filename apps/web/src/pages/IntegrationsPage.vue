<script setup lang="ts">
/**
 * Integrations Dashboard Page
 *
 * Central hub for managing external system integrations.
 * Currently supports shell/scaffold for: GLPI, SAT, Zimbra Mail, Microsoft Outlook
 */
import { ref, computed } from "vue";
import IntegrationCard from "../components/integrations/IntegrationCard.vue";

interface Integration {
  id: string;
  name: string;
  description: string;
  type: string;
  status: "connected" | "disconnected" | "error" | "pending";
  icon: string;
  color: string;
  features: string[];
  configurable: boolean;
}

const integrations = ref<Integration[]>([
  {
    id: "glpi",
    name: "GLPI",
    description: "Sistema de Gestão de Suporte, Helpdesk e Recursos de TI",
    type: "Helpdesk/ITSM",
    status: "disconnected",
    icon: "headphones",
    color: "#9b2335",
    features: [
      "Sincronização de tickets",
      "Gestão de ativos",
      "Mapeamento de usuários",
      "Rastreamento de SLA",
      "Base de conhecimento",
    ],
    configurable: true,
  },
  {
    id: "sat",
    name: "SAT",
    description: "Sistema ERP para gestão financeira e inventário",
    type: "ERP",
    status: "disconnected",
    icon: "database",
    color: "#2563eb",
    features: [
      "Sincronização de faturas",
      "Rastreamento de pagamentos",
      "Níveis de estoque",
      "Gestão de pedidos",
      "Relatórios financeiros",
    ],
    configurable: true,
  },
  {
    id: "zimbra",
    name: "Zimbra Mail",
    description: "Cliente de e-mail e colaboração",
    type: "E-mail/Calendário",
    status: "disconnected",
    icon: "mail",
    color: "#ef6c00",
    features: [
      "Sincronização de e-mails",
      "Integração de calendário",
      "Sincronização de contatos",
      "Sincronização de tarefas",
      "Gestão de anexos",
    ],
    configurable: true,
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Integração com Microsoft 365 via Graph API",
    type: "E-mail/Microsoft 365",
    status: "disconnected",
    icon: "mail",
    color: "#0078d4",
    features: [
      "Sincronização de e-mails",
      "Eventos de calendário",
      "Sincronização de contatos",
      "Microsoft To Do",
      "Potencial integração Teams",
    ],
    configurable: true,
  },
]);

const expandedCards = ref<Set<string>>(new Set());

const toggleExpand = (id: string) => {
  if (expandedCards.value.has(id)) {
    expandedCards.value.delete(id);
  } else {
    expandedCards.value.add(id);
  }
};

const isExpanded = (id: string) => expandedCards.value.has(id);

const connectedCount = computed(
  () => integrations.value.filter((i) => i.status === "connected").length
);

const openConfig = (integration: Integration) => {
  // Placeholder for opening configuration modal
  console.log(`[Integrations] Opening config for: ${integration.name}`);
  alert(
    `Configuração de ${integration.name} será implementada em breve.\n\nEsta é uma versão de demonstração do portfólio.`
  );
};

const testConnection = async (integration: Integration) => {
  console.log(`[Integrations] Testing connection for: ${integration.name}`);
  alert(
    `Teste de conexão para ${integration.name} será implementado em breve.\n\nEsta é uma versão de demonstração do portfólio.`
  );
};
</script>

<template>
  <div class="integrations-page">
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="title-icon"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M12 1v6m0 6v10M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m6 0h10M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"
            />
          </svg>
          Integrações
        </h1>
        <p class="page-subtitle">
          Conecte o CRM com sistemas externos para automatizar fluxos de
          trabalho
        </p>
      </div>

      <div class="header-stats">
        <div class="stat-card">
          <span class="stat-value">{{ integrations.length }}</span>
          <span class="stat-label">Disponíveis</span>
        </div>
        <div class="stat-card stat-connected">
          <span class="stat-value">{{ connectedCount }}</span>
          <span class="stat-label">Conectadas</span>
        </div>
      </div>
    </header>

    <div class="integrations-notice">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="notice-icon"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p>
        <strong>Projeto de Portfólio:</strong> As integrações abaixo são shells
        demonstrativos. Em um ambiente de produção, cada integração teria
        configuração completa de API, OAuth e mapeamento de dados.
      </p>
    </div>

    <div class="integrations-grid">
      <IntegrationCard
        v-for="integration in integrations"
        :key="integration.id"
        :integration="integration"
        :is-expanded="isExpanded(integration.id)"
        @toggle="toggleExpand(integration.id)"
        @configure="openConfig(integration)"
        @test="testConnection(integration)"
      />
    </div>
  </div>
</template>

<style scoped>
.integrations-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-content {
  flex: 1;
  min-width: 280px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  margin: 0 0 0.5rem;
}

.title-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary, #3b82f6);
}

.page-subtitle {
  color: var(--color-text-muted, #6b7280);
  margin: 0;
  font-size: 0.95rem;
}

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 0.75rem 1.25rem;
  text-align: center;
  min-width: 100px;
}

.stat-card.stat-connected {
  border-color: var(--color-success, #10b981);
  background: rgba(16, 185, 129, 0.05);
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text, #1f2937);
}

.stat-connected .stat-value {
  color: var(--color-success, #10b981);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.integrations-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.notice-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-primary, #3b82f6);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.integrations-notice p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text, #1f2937);
  line-height: 1.5;
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

@media (max-width: 640px) {
  .integrations-page {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .header-stats {
    width: 100%;
    justify-content: center;
  }

  .integrations-grid {
    grid-template-columns: 1fr;
  }
}
</style>
