<script setup lang="ts">
import { computed } from "vue";
import {
  BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS,
  type IntegrationHelpEntry,
} from "../../services/IntegrationHelpCatalogService";

const props = defineProps<{
  open: boolean;
  entry: IntegrationHelpEntry | null;
  integrationName?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const modalId = computed(
  () => `integration-help-modal-${props.entry?.integrationId || "none"}`,
);
const titleId = computed(() => `${modalId.value}-title`);
const descriptionId = computed(() => `${modalId.value}-description`);
const sectionAboutId = computed(() => `${modalId.value}-about`);
const sectionHowToId = computed(() => `${modalId.value}-howto`);

const closeModal = (): void => {
  emit("close");
};

const handleBackdropKeydown = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closeModal();
};

const capabilityTermId = (capabilityKey: string): string =>
  `${modalId.value}-capability-${capabilityKey}`;
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && entry"
      :class="$style.helpRoot"
      role="presentation"
      tabindex="-1"
      :data-help-modal-state="open ? 'open' : 'closed'"
      :data-integration-id="entry.integrationId"
      @click.self="closeModal"
      @keydown="handleBackdropKeydown"
    >
      <section
        :id="modalId"
        :class="$style.helpPanel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
      >
        <header :class="$style.helpHeader">
          <h2 :id="titleId" :class="$style.helpTitle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              :class="$style.helpIcon"
              aria-hidden="true"
            >
              <path
                v-for="(
                  pathData, pathIndex
                ) in BOOTSTRAP_QUESTION_CIRCLE_ICON_PATHS"
                :key="`help-question-path-${pathIndex}`"
                :d="pathData"
              />
            </svg>
            Ajuda: {{ integrationName || entry.integrationName }}
          </h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :class="$style.helpCloseButton"
            title="Fechar ajuda de integração"
            aria-label="Fechar modal de ajuda"
            @click="closeModal"
          >
            Fechar
          </button>
        </header>

        <p :id="descriptionId" :class="$style.helpDescription">
          <strong>{{ entry.integrationName }}:</strong>
          <em>{{ entry.contextDefinition }}</em>
        </p>

        <div :class="$style.helpAccordion" role="list">
          <details
            :id="sectionAboutId"
            :class="$style.helpFold"
            role="listitem"
            :aria-label="`Descrição e vantagens de ${entry.integrationName}`"
            :data-help-section="'about'"
            open
          >
            <summary :class="$style.helpSummary">
              <span :class="$style.summaryTitle">
                Descrição das funcionalidades e vantagens
              </span>
              <span :class="$style.summaryHint">Expandir ou recolher</span>
            </summary>
            <div :class="$style.helpFoldContent">
              <dl :class="$style.definitionList">
                <div
                  v-for="capability in entry.capabilities"
                  :key="capability.key"
                  :class="$style.definitionItem"
                >
                  <dt
                    :id="capabilityTermId(capability.key)"
                    :class="$style.definitionTerm"
                  >
                    <dfn>{{ capability.term }}</dfn>
                    <abbr
                      v-if="
                        capability.abbreviation && capability.abbreviationTitle
                      "
                      :class="$style.capabilityAbbr"
                      :title="capability.abbreviationTitle"
                    >
                      {{ capability.abbreviation }}
                    </abbr>
                  </dt>
                  <dd :class="$style.definitionDescription">
                    <strong>{{ capability.highlight }}</strong>
                    <em>{{ capability.description }}</em>
                  </dd>
                </div>
              </dl>

              <h4 :class="$style.listTitle">Principais vantagens</h4>
              <ul :class="$style.advantageList" role="list">
                <li
                  v-for="advantage in entry.advantages"
                  :key="advantage.key"
                  :class="$style.advantageItem"
                >
                  <strong>{{ advantage.title }}:</strong>
                  <em>{{ advantage.detail }}</em>
                </li>
              </ul>
            </div>
          </details>

          <details
            :id="sectionHowToId"
            :class="$style.helpFold"
            role="listitem"
            :aria-label="`Guia de configuração para ${entry.integrationName}`"
            :data-help-section="'how-to'"
          >
            <summary :class="$style.helpSummary">
              <span :class="$style.summaryTitle">How-to de configuração</span>
              <span :class="$style.summaryHint">Expandir ou recolher</span>
            </summary>
            <div :class="$style.helpFoldContent">
              <ol :class="$style.stepsList">
                <li
                  v-for="(step, index) in entry.howTo"
                  :key="step.key"
                  :class="$style.stepItem"
                >
                  <p :class="$style.stepTitle">
                    <strong>Passo {{ index + 1 }}:</strong> {{ step.title }}
                  </p>
                  <p :class="$style.stepDescription">
                    <em>{{ step.detail }}</em>
                  </p>
                </li>
              </ol>
            </div>
          </details>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style
  module
  lang="scss"
  src="../../styles/components/integrations/integration-help-modal.module.scss"
></style>
