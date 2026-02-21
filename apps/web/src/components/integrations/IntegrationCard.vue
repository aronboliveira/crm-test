<script setup lang="ts">
import { computed } from "vue";

interface Integration {
  id: string;
  name: string;
  description: string;
  type: string;
  status: "connected" | "disconnected" | "error" | "pending";
  icon: string;
  logoUrl?: string;
  logoPresentation?: {
    scale: number;
    offsetYRem?: number;
  };
  color: string;
  features: string[];
  configurable: boolean;
}

interface IntegrationHelpTriggerPayload {
  triggerElementId: string;
}

const BOOTSTRAP_INFO_CIRCLE_ICON_PATHS = [
  "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16",
  "m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
];

const BOOTSTRAP_ROUTER_ICON_PATHS = [
  "M5.525 3.025a3.5 3.5 0 0 1 4.95 0 .5.5 0 1 0 .707-.707 4.5 4.5 0 0 0-6.364 0 .5.5 0 0 0 .707.707",
  "M6.94 4.44a1.5 1.5 0 0 1 2.12 0 .5.5 0 0 0 .708-.708 2.5 2.5 0 0 0-3.536 0 .5.5 0 0 0 .707.707ZM2.5 11a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m4.5-.5a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0m2.5.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m1.5-.5a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0m2 0a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0",
  "M2.974 2.342a.5.5 0 1 0-.948.316L3.806 8H1.5A1.5 1.5 0 0 0 0 9.5v2A1.5 1.5 0 0 0 1.5 13H2a.5.5 0 0 0 .5.5h2A.5.5 0 0 0 5 13h6a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5h.5a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 14.5 8h-2.306l1.78-5.342a.5.5 0 1 0-.948-.316L11.14 8H4.86zM14.5 9a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5z",
  "M8.5 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0",
];

const BOOTSTRAP_GEAR_WIDE_CONNECTED_ICON_PATHS = [
  "M7.068.727c.243-.97 1.62-.97 1.864 0l.071.286a.96.96 0 0 0 1.622.434l.205-.211c.695-.719 1.888-.03 1.613.931l-.08.284a.96.96 0 0 0 1.187 1.187l.283-.081c.96-.275 1.65.918.931 1.613l-.211.205a.96.96 0 0 0 .434 1.622l.286.071c.97.243.97 1.62 0 1.864l-.286.071a.96.96 0 0 0-.434 1.622l.211.205c.719.695.03 1.888-.931 1.613l-.284-.08a.96.96 0 0 0-1.187 1.187l.081.283c.275.96-.918 1.65-1.613.931l-.205-.211a.96.96 0 0 0-1.622.434l-.071.286c-.243.97-1.62.97-1.864 0l-.071-.286a.96.96 0 0 0-1.622-.434l-.205.211c-.695.719-1.888.03-1.613-.931l.08-.284a.96.96 0 0 0-1.186-1.187l-.284.081c-.96.275-1.65-.918-.931-1.613l.211-.205a.96.96 0 0 0-.434-1.622l-.286-.071c-.97-.243-.97-1.62 0-1.864l.286-.071a.96.96 0 0 0 .434-1.622l-.211-.205c-.719-.695-.03-1.888.931-1.613l.284.08a.96.96 0 0 0 1.187-1.186l-.081-.284c-.275-.96.918-1.65 1.613-.931l.205.211a.96.96 0 0 0 1.622-.434zM12.973 8.5H8.25l-2.834 3.779A4.998 4.998 0 0 0 12.973 8.5m0-1a4.998 4.998 0 0 0-7.557-3.779l2.834 3.78zM5.048 3.967l-.087.065zm-.431.355A4.98 4.98 0 0 0 3.002 8c0 1.455.622 2.765 1.615 3.678L7.375 8zm.344 7.646.087.065z",
];

const BOOTSTRAP_FALLBACK_ICON_PATHS = Object.freeze({
  headset: [
    "M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5",
  ],
  database: [
    "M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313M13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A5 5 0 0 0 13 5.698M14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A5 5 0 0 0 13 8.698m0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525",
  ],
  envelope: [
    "M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z",
  ],
  gear: [
    "M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0",
    "M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z",
  ],
} as const);

type BootstrapFallbackIconKey = keyof typeof BOOTSTRAP_FALLBACK_ICON_PATHS;

const FALLBACK_ICON_ALIASES = Object.freeze({
  headphones: "headset",
  document: "database",
  cloud: "database",
  mail: "envelope",
  calendar: "envelope",
  settings: "gear",
} as const);

const props = defineProps<{
  integration: Integration;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  configure: [integration: Integration];
  test: [integration: Integration];
  help: [payload: IntegrationHelpTriggerPayload];
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
const actionsId = computed(() => `${cardId.value}-actions`);
const helpButtonId = computed(() => `${cardId.value}-help`);
const iconWrapperStyle = computed<Record<string, string>>(() => {
  const presentation = props.integration.logoPresentation;
  return {
    "--integration-logo-scale": `${presentation?.scale ?? 1}`,
    "--integration-logo-offset-y": `${presentation?.offsetYRem ?? 0}rem`,
  };
});

const getFallbackIconPaths = (iconName: string): readonly string[] => {
  const aliasKey = iconName as keyof typeof FALLBACK_ICON_ALIASES;
  const normalizedIconName = FALLBACK_ICON_ALIASES[aliasKey] ?? iconName;
  if (normalizedIconName in BOOTSTRAP_FALLBACK_ICON_PATHS) {
    return BOOTSTRAP_FALLBACK_ICON_PATHS[
      normalizedIconName as BootstrapFallbackIconKey
    ];
  }
  return BOOTSTRAP_FALLBACK_ICON_PATHS.gear;
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("toggle");
  }
};

const emitHelp = (): void => {
  emit("help", { triggerElementId: helpButtonId.value });
};
</script>

<template>
  <article
    :id="cardId"
    class="integration-card"
    :class="{ 'is-expanded': isExpanded }"
    :style="{ '--accent-color': integration.color }"
    :aria-labelledby="headerId"
    role="listitem"
    :data-integration-id="integration.id"
    :data-integration-name="integration.name"
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
          :class="{ 'has-logo': Boolean(integration.logoUrl) }"
          :style="iconWrapperStyle"
          :title="integration.name"
        >
          <img
            v-if="integration.logoUrl"
            :src="integration.logoUrl"
            :alt="`${integration.name} logo`"
            class="integration-logo"
            loading="lazy"
          />
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="integration-fallback-icon"
            aria-hidden="true"
          >
            <path
              v-for="(pathData, pathIndex) in getFallbackIconPaths(integration.icon)"
              :key="`integration-fallback-path-${pathIndex}`"
              :d="pathData"
            />
          </svg>
        </div>
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

        <div
          :id="actionsId"
          class="card-actions"
          role="group"
          :aria-label="`Ações da integração ${integration.name}`"
        >
          <button
            :id="helpButtonId"
            class="btn btn-secondary"
            type="button"
            :title="`Abrir ajuda de ${integration.name}`"
            :aria-label="`Abrir ajuda da integração ${integration.name}`"
            :data-help-target="'integration-help-modal'"
            :data-help-integration-id="integration.id"
            :data-help-integration-name="integration.name"
            @click.stop="emitHelp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="integration-action-icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in BOOTSTRAP_INFO_CIRCLE_ICON_PATHS"
                :key="`help-question-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>
            <span class="btn-separator" aria-hidden="true">|</span>
            <span class="btn-label">Ajuda</span>
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :title="`Testar conexão com ${integration.name}`"
            @click.stop="emit('test', integration)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="integration-action-icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in BOOTSTRAP_ROUTER_ICON_PATHS"
                :key="`test-router-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>
            <span class="btn-separator" aria-hidden="true">|</span>
            <span class="btn-label">Testar Conexão</span>
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
              viewBox="0 0 16 16"
              fill="currentColor"
              class="integration-action-icon"
              aria-hidden="true"
            >
              <path
                v-for="(pathData, pathIndex) in BOOTSTRAP_GEAR_WIDE_CONNECTED_ICON_PATHS"
                :key="`configure-gear-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>
            <span class="btn-separator" aria-hidden="true">|</span>
            <span class="btn-label">Configurar</span>
          </button>
        </div>
      </div>
    </Transition>
  </article>
</template>

<style lang="scss">
@use "../../styles/components/integrations/integration-card";
</style>
