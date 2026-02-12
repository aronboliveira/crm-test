<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useAuthStore } from "../../pinia/stores/auth.store";
import { useAssistantChatState } from "./useAssistantChatState";
import {
  useAssistantChatSocketShell,
  type AssistantChatTranscriptEntry,
} from "./useAssistantChatSocketShell";
import { buildVisibleAssistantTranscriptRows } from "./assistantChatView.utils";
import StorageService from "../../services/StorageService";
import {
  ASSISTANT_CHAT_WIDGET_PERSIST_KEY,
  createAssistantChatWidgetPersistedState,
  sanitizeAssistantChatWidgetPersistedState,
  toTimestampOrNull,
} from "./assistantChatPersistence.utils";

const POPUP_ID = "crm-assistant-chat-popup";
const MOCK_REPLY_DELAY_MS = 3600;
const MOCK_ASSISTANT_REPLY =
  "Eu ainda não penso, mas de alguma forma ainda respondo! Que curioso!";

const BotChatLauncher = defineAsyncComponent(
  () => import("./BotChatLauncher.vue"),
);

const BotChatPopup = defineAsyncComponent(() => import("./BotChatPopup.vue"));

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isLoggedIn);
const authToken = computed(() => authStore.token ?? "");
const endpoint = computed(() => {
  const configured = String(import.meta.env.VITE_ASSISTANT_WS_URL ?? "").trim();
  if (configured) {
    return configured;
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (apiBase) {
    try {
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:5173";
      const parsed = new URL(apiBase, base);
      const scheme = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${scheme}//${parsed.host}/ws/assistant/chat`;
    } catch {
      // continue to location fallback
    }
  }

  if (typeof window === "undefined") {
    return "ws://localhost:3000/ws/assistant/chat";
  }

  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}/ws/assistant/chat`;
});

const { close, isOpen, shouldRenderPopup, toggle } = useAssistantChatState();
const socketShell = useAssistantChatSocketShell({
  endpoint: endpoint.value,
  getAuthToken: () => authToken.value,
});
const persistedState = sanitizeAssistantChatWidgetPersistedState(
  StorageService.local.getJson<unknown>(
    ASSISTANT_CHAT_WIDGET_PERSIST_KEY,
    createAssistantChatWidgetPersistedState(),
  ),
);
const mockReplies = ref<AssistantChatTranscriptEntry[]>(persistedState.mockReplies);
const pendingMockReplies = ref(0);
const mockReplyTimers = ref<ReturnType<typeof setTimeout>[]>([]);
const hiddenMessageIds = ref<string[]>(persistedState.hiddenMessageIds);
const historyClearedAt = ref<string>(persistedState.historyClearedAt);
const hiddenMessageIdsSet = computed(() => new Set(hiddenMessageIds.value));
const historyClearedAtTs = computed(() => toTimestampOrNull(historyClearedAt.value));

const persistWidgetState = (): void => {
  StorageService.local.setJson(ASSISTANT_CHAT_WIDGET_PERSIST_KEY, {
    mockReplies: mockReplies.value,
    hiddenMessageIds: hiddenMessageIds.value,
    historyClearedAt: historyClearedAt.value,
  });
};

const setMockReplies = (next: AssistantChatTranscriptEntry[]): void => {
  mockReplies.value = next;
  persistWidgetState();
};

const setHiddenMessageIds = (next: readonly string[]): void => {
  hiddenMessageIds.value = Array.from(
    new Set(
      next
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0),
    ),
  ).slice(-240);
  persistWidgetState();
};

const setHistoryClearedAt = (next: string): void => {
  historyClearedAt.value = String(next ?? "").trim();
  persistWidgetState();
};

const transcriptRows = computed<AssistantChatTranscriptEntry[]>(() => {
  const mergedRows = buildVisibleAssistantTranscriptRows(
    socketShell.transcript.value,
    mockReplies.value,
  );

  const hiddenIds = hiddenMessageIdsSet.value;
  const clearThreshold = historyClearedAtTs.value;

  return mergedRows.filter((row) => {
    if (hiddenIds.has(row.id)) {
      return false;
    }

    if (clearThreshold === null) {
      return true;
    }

    const rowTs = toTimestampOrNull(row.at);
    return rowTs !== null && rowTs >= clearThreshold;
  });
});
const isThinking = computed(() => pendingMockReplies.value > 0);

const createMockReply = (): AssistantChatTranscriptEntry => ({
  id: `assistant-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  direction: "incoming",
  text: MOCK_ASSISTANT_REPLY,
  at: new Date().toISOString(),
  pending: false,
});

const clearMockReplyTimers = (): void => {
  if (mockReplyTimers.value.length === 0) {
    return;
  }
  for (const timer of mockReplyTimers.value) {
    clearTimeout(timer);
  }
  mockReplyTimers.value = [];
};

const cancelMostRecentPendingMockReply = (): void => {
  if (pendingMockReplies.value === 0 || mockReplyTimers.value.length === 0) {
    return;
  }

  const nextTimers = [...mockReplyTimers.value];
  const lastTimer = nextTimers.pop();
  if (!lastTimer) {
    return;
  }

  clearTimeout(lastTimer);
  mockReplyTimers.value = nextTimers;
  pendingMockReplies.value = Math.max(0, pendingMockReplies.value - 1);
};

const queueMockReply = (): void => {
  pendingMockReplies.value += 1;
  const timer = setTimeout(() => {
    pendingMockReplies.value = Math.max(0, pendingMockReplies.value - 1);
    setMockReplies([...mockReplies.value, createMockReply()]);
    mockReplyTimers.value = mockReplyTimers.value.filter(
      (nextTimer) => nextTimer !== timer,
    );
  }, MOCK_REPLY_DELAY_MS);

  mockReplyTimers.value = [...mockReplyTimers.value, timer];
};

watch(
  isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      return;
    }

    socketShell.disconnect("assistant-chat-auth-logout");
    clearMockReplyTimers();
    pendingMockReplies.value = 0;
    setMockReplies([]);
    setHiddenMessageIds([]);
    setHistoryClearedAt("");
    close("auth");
  },
  { flush: "sync" },
);

watch(
  [isAuthenticated, isOpen],
  ([loggedIn, open]) => {
    if (!loggedIn) {
      socketShell.disconnect("assistant-chat-auth-required");
      return;
    }

    if (open) {
      socketShell.connect();
      return;
    }

    socketShell.disconnect("assistant-chat-hidden");
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  socketShell.disconnect("assistant-chat-unmounted");
  clearMockReplyTimers();
});

const handleToggle = (): void => {
  toggle("launcher");
};

const handleClose = (): void => {
  close("launcher");
};

const handleEscape = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") {
    return;
  }

  close("keyboard");
};

const handleSend = (text: string): void => {
  const didSend = socketShell.sendUserMessage(text);
  if (!didSend) {
    return;
  }
  queueMockReply();
};

const handleClearHistory = (): void => {
  clearMockReplyTimers();
  pendingMockReplies.value = 0;
  setMockReplies([]);
  setHiddenMessageIds([]);
  setHistoryClearedAt(new Date().toISOString());
  socketShell.clearTranscript();
};

const handleClearLastMessage = (): void => {
  const lastVisibleMessage = transcriptRows.value.at(-1);
  if (!lastVisibleMessage) {
    return;
  }

  const mockEntryExists = mockReplies.value.some(
    (entry) => entry.id === lastVisibleMessage.id,
  );
  setHiddenMessageIds([...hiddenMessageIds.value, lastVisibleMessage.id]);

  if (mockEntryExists) {
    setMockReplies(
      mockReplies.value.filter(
        (entry) => entry.id !== lastVisibleMessage.id,
      ),
    );
    return;
  }

  const removedSocketMessage = socketShell.removeTranscriptEntry(
    lastVisibleMessage.id,
  );
  if (removedSocketMessage && lastVisibleMessage.direction === "outgoing") {
    cancelMostRecentPendingMockReply();
  }
};

watch(
  () => socketShell.transcript.value.length,
  () => {
    persistWidgetState();
  },
  { flush: "post" },
);

watch(
  () => socketShell.pendingCount.value,
  () => {
    persistWidgetState();
  },
  { flush: "post" },
);

watch(
  [mockReplies, hiddenMessageIds, historyClearedAt],
  () => {
    persistWidgetState();
  },
  { deep: true, flush: "post" },
);
</script>

<template>
  <div
    v-if="isAuthenticated"
    class="assistant-widget-layer"
    @keydown.capture="handleEscape"
  >
    <BotChatLauncher :open="isOpen" :popup-id="POPUP_ID" @toggle="handleToggle" />
    <BotChatPopup
      v-if="shouldRenderPopup"
      :open="isOpen"
      :popup-id="POPUP_ID"
      :transcript="transcriptRows"
      :thinking="isThinking"
      :socket-configured="socketShell.isConfigured.value"
      :socket-status="socketShell.status.value"
      :socket-error="socketShell.lastError.value"
      :queue-count="socketShell.pendingCount.value"
      @close="handleClose"
      @send="handleSend"
      @clear-history="handleClearHistory"
      @clear-last-message="handleClearLastMessage"
    />
  </div>
</template>

<style scoped lang="scss">
.assistant-widget-layer {
  pointer-events: none;
}
</style>
