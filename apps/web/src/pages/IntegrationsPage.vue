<script setup lang="ts">
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
  () => integrations.value.filter((i) => i.status === "connected").length,
);

const openConfig = (integration: Integration) => {
  console.log(`[Integrations] Opening config for: ${integration.name}`);
  alert(
    `Configuração de ${integration.name} será implementada em breve.\n\nEsta é uma versão de demonstração do portfólio.`,
  );
};

const testConnection = async (integration: Integration) => {
  console.log(`[Integrations] Testing connection for: ${integration.name}`);
  alert(
    `Teste de conexão para ${integration.name} será implementado em breve.\n\nEsta é uma versão de demonstração do portfólio.`,
  );
};
</script>

<template>
  <main class="integrations-page" aria-labelledby="integrations-title">
    <header class="page-header">
      <div class="header-content">
        <h1 id="integrations-title" class="page-title">
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

      <div class="header-stats" role="group" aria-label="Estatísticas de integrações">
        <div class="stat-card" title="Total de integrações disponíveis">
          <span class="stat-value" aria-label="Disponíveis">{{ integrations.length }}</span>
          <span class="stat-label">Disponíveis</span>
        </div>
        <div class="stat-card stat-connected" title="Integrações conectadas">
          <span class="stat-value" aria-label="Conectadas">{{ connectedCount }}</span>
          <span class="stat-label">Conectadas</span>
        </div>
      </div>
    </header>

    <div class="integrations-notice" role="note" aria-live="polite">
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

    <section 
      class="integrations-grid" 
      aria-label="Lista de integrações disponíveis"
    >
      <IntegrationCard
        v-for="integration in integrations"
        :key="integration.id"
        :integration="integration"
        :is-expanded="isExpanded(integration.id)"
        @toggle="toggleExpand(integration.id)"
        @configure="openConfig(integration)"
        @test="testConnection(integration)"
      />
    </section>
  </main>
</template>

<style lang="scss">
@use "../styles/components/integrations/integrations-page";
</style>
