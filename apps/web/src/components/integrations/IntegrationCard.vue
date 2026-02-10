<script setup lang="ts">
import { computed } from "vue";

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

const props = defineProps<{
  integration: Integration;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  configure: [integration: Integration];
  test: [integration: Integration];
}>();

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    connected: "Conectado",
    disconnected: "Desconectado",
    error: "Erro",
    pending: "Pendente",
  };
  return labels[props.integration.status] || "Desconhecido";
});

const statusClass = computed(() => `status-${props.integration.status}`);

const cardId = computed(() => `integration-card-${props.integration.id}`);
const headerId = computed(() => `${cardId.value}-header`);
const bodyId = computed(() => `${cardId.value}-body`);

const getIcon = (iconName: string) => {
  const icons: Record<string, string> = {
    headphones: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    database: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  };
  return icons[iconName] || icons.settings;
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("toggle");
  }
};
</script>

<template>
  <article
    :id="cardId"
    class="integration-card"
    :class="{ 'is-expanded': isExpanded }"
    :style="{ '--accent-color': integration.color }"
    :aria-labelledby="headerId"
  >
    <header
      :id="headerId"
      class="card-header"
      role="button"
      tabindex="0"
      :aria-expanded="isExpanded"
      :aria-controls="bodyId"
      :title="`${integration.name} - ${statusLabel}. Clique para ${isExpanded ? 'recolher' : 'expandir'}`"
      @click="emit('toggle')"
      @keydown="handleKeyDown"
    >
      <div class="header-left">
        <div
          class="icon-wrapper"
          v-html="getIcon(integration.icon)"
          :title="integration.name"
        ></div>
        <div class="header-info">
          <h3 class="card-title">{{ integration.name }}</h3>
          <span class="card-type">{{ integration.type }}</span>
        </div>
      </div>

      <div class="header-right">
        <span
          class="status-badge"
          :class="statusClass"
          role="status"
          :aria-label="`Status: ${statusLabel}`"
        >
          {{ statusLabel }}
        </span>
        <span class="expand-btn" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="chevron-icon"
            :class="{ rotated: isExpanded }"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </header>

    <Transition name="collapse">
      <div
        v-if="isExpanded"
        :id="bodyId"
        class="card-body"
        role="region"
        :aria-labelledby="headerId"
      >
        <p class="card-description">{{ integration.description }}</p>

        <section
          class="features-section"
          aria-label="Funcionalidades disponíveis"
        >
          <h4 class="features-title">Funcionalidades</h4>
          <ul class="features-list" role="list">
            <li
              v-for="(feature, idx) in integration.features"
              :key="idx"
              class="feature-item"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="check-icon"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </section>

        <div class="card-actions" role="group" aria-label="Ações da integração">
          <button
            class="btn btn-secondary"
            type="button"
            :title="`Testar conexão com ${integration.name}`"
            @click.stop="emit('test', integration)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="btn-icon"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Testar Conexão
          </button>
          <button
            v-if="integration.configurable"
            class="btn btn-primary"
            type="button"
            :title="`Configurar integração ${integration.name}`"
            @click.stop="emit('configure', integration)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="btn-icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            Configurar
          </button>
        </div>
      </div>
    </Transition>
  </article>
</template>

<style lang="scss">
@use "../../styles/components/integrations/integration-card";
</style>
