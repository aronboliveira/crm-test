<script setup lang="ts">
/**
 * IntegrationCard Component
 *
 * Collapsible card for displaying integration details and actions.
 */
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

const getIcon = (iconName: string) => {
  const icons: Record<string, string> = {
    headphones: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
    database: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  };
  return icons[iconName] || icons.settings;
};
</script>

<template>
  <article
    class="integration-card"
    :class="{ 'is-expanded': isExpanded }"
    :style="{ '--accent-color': integration.color }"
  >
    <header class="card-header" @click="emit('toggle')">
      <div class="header-left">
        <div class="icon-wrapper" v-html="getIcon(integration.icon)"></div>
        <div class="header-info">
          <h3 class="card-title">{{ integration.name }}</h3>
          <span class="card-type">{{ integration.type }}</span>
        </div>
      </div>

      <div class="header-right">
        <span class="status-badge" :class="statusClass">
          {{ statusLabel }}
        </span>
        <button
          class="expand-btn"
          type="button"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? 'Recolher' : 'Expandir'"
        >
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
        </button>
      </div>
    </header>

    <transition name="collapse">
      <div v-if="isExpanded" class="card-body">
        <p class="card-description">{{ integration.description }}</p>

        <div class="features-section">
          <h4 class="features-title">Funcionalidades</h4>
          <ul class="features-list">
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
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ feature }}
            </li>
          </ul>
        </div>

        <div class="card-actions">
          <button
            class="btn btn-secondary"
            type="button"
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
    </transition>
  </article>
</template>

<style scoped>
.integration-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.integration-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.integration-card.is-expanded {
  border-color: var(--accent-color, var(--color-primary, #3b82f6));
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
}

.card-header:hover {
  background: var(--color-hover, rgba(0, 0, 0, 0.02));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.icon-wrapper {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color, var(--color-primary, #3b82f6));
  border-radius: 0.5rem;
  color: #fff;
}

.icon-wrapper :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  margin: 0;
}

.card-type {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-connected {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-disconnected {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.status-error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.expand-btn {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.card-body {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.card-description {
  margin: 1rem 0;
  font-size: 0.9rem;
  color: var(--color-text, #1f2937);
  line-height: 1.5;
}

.features-section {
  margin-bottom: 1rem;
}

.features-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #6b7280);
  margin: 0 0 0.75rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: var(--color-text, #1f2937);
  background: var(--color-hover, rgba(0, 0, 0, 0.03));
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
}

.check-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--accent-color, var(--color-primary, #3b82f6));
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn:active {
  transform: scale(0.98);
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.btn-primary {
  background: var(--accent-color, var(--color-primary, #3b82f6));
  color: #fff;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--color-surface, #fff);
  color: var(--color-text, #1f2937);
  border: 1px solid var(--color-border, #e5e7eb);
}

.btn-secondary:hover {
  background: var(--color-hover, rgba(0, 0, 0, 0.03));
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
