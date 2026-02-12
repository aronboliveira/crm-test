<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import styles from "./BotChatPopup.module.scss";
import { createCssModuleClassMemo } from "./styleMemo";
import type {
  AssistantChatTranscriptEntry,
  AssistantSocketStatus,
} from "./useAssistantChatSocketShell";

const CHAT_COPY = Object.freeze({
  title: "Assistente CRM",
  subtitle: "Prévia da interface websocket",
  greeting:
    "Olá! Sou seu assistente CRM. O transporte em tempo real ainda está em fase de shell, mas a interface já está pronta.",
  thinking: "Pensando...",
});
const SCROLL_BOTTOM_DELAY_MS = 120;
const SCROLL_BOTTOM_CONFIRM_DELAY_MS = 260;

const props = defineProps<{
  open: boolean;
  popupId: string;
  transcript: AssistantChatTranscriptEntry[];
  thinking: boolean;
  socketConfigured: boolean;
  socketStatus: AssistantSocketStatus;
  socketError: string;
  queueCount: number;
}>();

const emit = defineEmits<{
  close: [];
  send: [text: string];
  clearHistory: [];
  clearLastMessage: [];
}>();

const draft = ref("");
const composerInputRef = ref<HTMLTextAreaElement | null>(null);
const messagesContainerRef = ref<HTMLDivElement | null>(null);
const isComposerListenerActive = ref(false);
const showEraseActions = ref(false);
let scrollBottomTimer: ReturnType<typeof setTimeout> | null = null;
let scrollBottomConfirmTimer: ReturnType<typeof setTimeout> | null = null;
let scrollBottomFrame: number | null = null;
const memoClass = createCssModuleClassMemo(styles);

const popupClass = computed(() =>
  memoClass(["popupRoot", props.open ? "popupOpen" : "popupClosed"]),
);

const canSend = computed(() => draft.value.trim().length > 0);
const transcriptRows = computed(() => props.transcript ?? []);
const hasAnyConversation = computed(
  () => transcriptRows.value.length > 0 || props.thinking,
);
const canClearLastMessage = computed(() => transcriptRows.value.length > 0);

const socketBadgeClass = computed(() =>
  memoClass([
    "socketBadge",
    props.socketConfigured ? "socketConfigured" : "socketDisabled",
    props.socketStatus === "open" ? "socketOpen" : "socketNotOpen",
  ]),
);

const socketLabel = computed(() => {
  if (!props.socketConfigured) {
    return "Endpoint websocket ausente";
  }
  if (props.socketStatus === "open") {
    return "Websocket conectado";
  }
  if (props.socketStatus === "connecting") {
    return "Conectando websocket...";
  }
  if (props.socketStatus === "error") {
    return "Erro no websocket";
  }
  return "Websocket offline";
});

const composerHint = computed(() => {
  if (!props.socketConfigured) {
    return "Defina VITE_ASSISTANT_WS_URL para ativar o transporte em tempo real.";
  }
  if (props.socketStatus === "open") {
    return "Conectado. As mensagens usarão websocket.";
  }
  if (props.queueCount > 0) {
    return `${props.queueCount} mensagem(ns) em fila para envio.`;
  }
  if (props.socketStatus === "connecting") {
    return "Conectando ao transporte websocket...";
  }
  if (props.socketError) {
    return props.socketError;
  }
  return "Shell websocket ativo. Resposta do backend ainda pendente.";
});

const closePopup = (): void => {
  emit("close");
};

const clearHistory = (): void => {
  if (!hasAnyConversation.value) {
    return;
  }
  emit("clearHistory");
};

const clearLastMessage = (): void => {
  if (!canClearLastMessage.value) {
    return;
  }
  emit("clearLastMessage");
};

const toggleEraseActions = (): void => {
  showEraseActions.value = !showEraseActions.value;
};

const submitDraft = (): void => {
  if (!canSend.value) {
    return;
  }

  const next = draft.value.trim();
  emit("send", next);
  draft.value = "";
  scheduleScrollToBottom();
};

const clearScrollBottomTimer = (): void => {
  if (!scrollBottomTimer) {
    return;
  }
  clearTimeout(scrollBottomTimer);
  scrollBottomTimer = null;
};

const clearScrollBottomConfirmTimer = (): void => {
  if (!scrollBottomConfirmTimer) {
    return;
  }
  clearTimeout(scrollBottomConfirmTimer);
  scrollBottomConfirmTimer = null;
};

const clearScrollBottomFrame = (): void => {
  if (scrollBottomFrame === null || typeof window === "undefined") {
    return;
  }
  window.cancelAnimationFrame(scrollBottomFrame);
  scrollBottomFrame = null;
};

const scrollToBottom = (): void => {
  const target = messagesContainerRef.value;
  if (!target) {
    return;
  }
  target.scrollTop = target.scrollHeight;
};

const settleScrollToBottom = (): void => {
  clearScrollBottomFrame();
  scrollToBottom();
  if (typeof window === "undefined") {
    return;
  }
  scrollBottomFrame = window.requestAnimationFrame(() => {
    scrollBottomFrame = null;
    scrollToBottom();
  });
};

const scheduleScrollToBottom = (): void => {
  clearScrollBottomTimer();
  clearScrollBottomConfirmTimer();
  clearScrollBottomFrame();
  void nextTick(() => {
    settleScrollToBottom();
    scrollBottomTimer = setTimeout(() => {
      scrollBottomTimer = null;
      settleScrollToBottom();
    }, SCROLL_BOTTOM_DELAY_MS);
    scrollBottomConfirmTimer = setTimeout(() => {
      scrollBottomConfirmTimer = null;
      settleScrollToBottom();
    }, SCROLL_BOTTOM_CONFIRM_DELAY_MS);
  });
};

const handleComposerEnter = (event: KeyboardEvent): void => {
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }
  event.preventDefault();
  submitDraft();
};

const attachComposerEnterListener = (): void => {
  if (isComposerListenerActive.value) {
    return;
  }

  const input = composerInputRef.value;
  if (!input) {
    return;
  }

  input.addEventListener("keydown", handleComposerEnter);
  isComposerListenerActive.value = true;
};

const detachComposerEnterListener = (): void => {
  if (!isComposerListenerActive.value) {
    return;
  }

  const input = composerInputRef.value;
  if (!input) {
    isComposerListenerActive.value = false;
    return;
  }

  input.removeEventListener("keydown", handleComposerEnter);
  isComposerListenerActive.value = false;
};

const handleComposerFocus = (): void => {
  attachComposerEnterListener();
};

const handleComposerBlur = (): void => {
  detachComposerEnterListener();
};

const handleEscape = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") {
    return;
  }

  closePopup();
};

onBeforeUnmount(() => {
  clearScrollBottomTimer();
  clearScrollBottomConfirmTimer();
  clearScrollBottomFrame();
  detachComposerEnterListener();
});

watch(
  () => [props.open, props.thinking, props.transcript.length] as const,
  ([open]) => {
    if (!open) {
      return;
    }
    scheduleScrollToBottom();
  },
  { flush: "post" },
);
</script>

<template>
  <section
    :id="popupId"
    :class="popupClass"
    :data-open="open ? 'true' : 'false'"
    role="dialog"
    aria-modal="false"
    aria-label="Chat do assistente"
    @keydown.capture="handleEscape"
  >
    <header :class="styles.header">
      <div :class="styles.titleWrap">
        <h2 :class="styles.title">{{ CHAT_COPY.title }}</h2>
        <p :class="styles.subtitle">
          {{ CHAT_COPY.subtitle }} ·
          <span :class="socketBadgeClass">{{ socketLabel }}</span>
        </p>
      </div>

      <button
        type="button"
        :class="styles.closeButton"
        aria-label="Fechar chat do assistente"
        @click="closePopup"
      >
        <svg
          viewBox="0 0 16 16"
          :class="styles.closeIcon"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.7"
          />
        </svg>
      </button>
    </header>

    <div
      ref="messagesContainerRef"
      :class="styles.messages"
      role="log"
      aria-live="polite"
    >
      <p :class="styles.botMessage">
        {{ CHAT_COPY.greeting }}
      </p>
      <p
        v-for="row in transcriptRows"
        :key="row.id"
        :class="
          row.direction === 'incoming'
            ? styles.botMessage
            : row.pending
              ? memoClass(['userMessage', 'userPending'])
              : styles.userMessage
        "
      >
        {{ row.text }}
      </p>
      <p v-if="thinking" :class="styles.thinkingMessage">
        {{ CHAT_COPY.thinking }}
      </p>
    </div>

    <form :class="styles.composer" @submit.prevent="submitDraft">
      <label :class="styles.composerLabel" for="assistant-chat-draft">
        Enviar mensagem
      </label>
      <textarea
        id="assistant-chat-draft"
        ref="composerInputRef"
        v-model="draft"
        :class="styles.composerInput"
        name="assistant-chat-draft"
        placeholder="Descreva o que você precisa..."
        rows="3"
        @focus="handleComposerFocus"
        @blur="handleComposerBlur"
      ></textarea>

      <button
        type="button"
        :class="styles.actionsToggle"
        :aria-expanded="showEraseActions ? 'true' : 'false'"
        @click="toggleEraseActions"
      >
        {{ showEraseActions ? "Ocultar ações de limpeza" : "Mostrar ações de limpeza" }}
      </button>

      <div v-if="showEraseActions" :class="styles.actionsRow">
        <button
          type="button"
          :class="memoClass(['iconActionButton', 'iconSecondaryAction'])"
          :disabled="!canClearLastMessage"
          aria-label="Limpar última mensagem"
          title="Limpar última mensagem"
          @click="clearLastMessage"
        >
          <span aria-hidden="true">⌫</span>
        </button>
        <button
          type="button"
          :class="memoClass(['iconActionButton', 'iconDangerAction'])"
          :disabled="!hasAnyConversation"
          aria-label="Limpar histórico de mensagens"
          title="Limpar histórico de mensagens"
          @click="clearHistory"
        >
          <span aria-hidden="true">✖</span>
        </button>
      </div>

      <div :class="styles.composerFooter">
        <p :class="styles.hint">{{ composerHint }}</p>
        <button type="submit" :class="styles.sendButton" :disabled="!canSend">
          Enviar
        </button>
      </div>
    </form>
  </section>
</template>
