<script setup lang="ts">
import { computed, ref } from "vue";
import styles from "./BotChatPopup.module.scss";
import { createCssModuleClassMemo } from "./styleMemo";

const CHAT_COPY = Object.freeze({
  title: "CRM Assistant",
  subtitle: "UI shell preview",
  greeting:
    "Hi, I am your CRM assistant. Realtime responses are not connected yet, but this panel is ready for websocket integration.",
  composerHint: "Realtime transport not configured in this stage.",
});

const props = defineProps<{
  open: boolean;
  popupId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const draft = ref("");
const memoClass = createCssModuleClassMemo(styles);

const popupClass = computed(() =>
  memoClass(["popupRoot", props.open ? "popupOpen" : "popupClosed"]),
);

const canSend = computed(() => draft.value.trim().length > 0);

const closePopup = (): void => {
  emit("close");
};

const submitDraft = (): void => {
  if (!canSend.value) {
    return;
  }

  draft.value = "";
};

const handleEscape = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") {
    return;
  }

  closePopup();
};
</script>

<template>
  <section
    :id="popupId"
    :class="popupClass"
    :data-open="open ? 'true' : 'false'"
    role="dialog"
    aria-modal="false"
    aria-label="Assistant chat"
    @keydown.capture="handleEscape"
  >
    <header :class="styles.header">
      <div :class="styles.titleWrap">
        <h2 :class="styles.title">{{ CHAT_COPY.title }}</h2>
        <p :class="styles.subtitle">{{ CHAT_COPY.subtitle }}</p>
      </div>

      <button
        type="button"
        :class="styles.closeButton"
        aria-label="Close assistant chat"
        @click="closePopup"
      >
        ×
      </button>
    </header>

    <div :class="styles.messages" role="log" aria-live="polite">
      <p :class="styles.botMessage">
        {{ CHAT_COPY.greeting }}
      </p>
    </div>

    <form :class="styles.composer" @submit.prevent="submitDraft">
      <label :class="styles.composerLabel" for="assistant-chat-draft">
        Send a message
      </label>
      <textarea
        id="assistant-chat-draft"
        v-model="draft"
        :class="styles.composerInput"
        name="assistant-chat-draft"
        placeholder="Describe what you need..."
        rows="3"
      ></textarea>

      <div :class="styles.composerFooter">
        <p :class="styles.hint">{{ CHAT_COPY.composerHint }}</p>
        <button type="submit" :class="styles.sendButton" :disabled="!canSend">
          Send
        </button>
      </div>
    </form>
  </section>
</template>
