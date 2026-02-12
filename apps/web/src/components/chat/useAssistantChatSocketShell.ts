import { computed, ref } from "vue";
import {
  AssistantSocketProtocol,
  type AssistantSocketPayload,
} from "./assistantChatSocket.protocol";
import { AssistantChatTranscriptUtils } from "./assistantChatTranscript.utils";
import type {
  AssistantChatSocketClient,
  AssistantChatSocketFactory,
  AssistantChatSocketShell,
  AssistantChatSocketShellOptions,
  AssistantChatTranscriptEntry,
  AssistantSocketStatus,
} from "./assistantChat.types";

const SOCKET_READY_CONNECTING = 0;
const SOCKET_READY_OPEN = 1;
const SOCKET_READY_CLOSING = 2;

const SOCKET_CLOSE_CODE_NORMAL = 1000;
const SOCKET_CLOSE_CODE_INTERNAL_ERROR = 1011;

const DEFAULT_CLOSE_REASON = "assistant-chat-idle";
const DEFAULT_RECONNECT_BASE_DELAY_MS = 500;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 10_000;
const DEFAULT_RECONNECT_MAX_ATTEMPTS = 6;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_TRANSCRIPT_ENTRIES = 120;

type TimerHandle = ReturnType<typeof setTimeout> | null;
type IntervalHandle = ReturnType<typeof setInterval> | null;

const defaultSocketFactory: AssistantChatSocketFactory = (url: string) =>
  new WebSocket(url);

export const useAssistantChatSocketShell = (
  options: AssistantChatSocketShellOptions,
): AssistantChatSocketShell => {
  const endpoint = String(options.endpoint ?? "").trim();
  const getAuthToken = options.getAuthToken ?? (() => null);
  const socketFactory = options.socketFactory ?? defaultSocketFactory;
  const now = options.now ?? (() => new Date().toISOString());

  const autoReconnect = options.autoReconnect !== false;
  const reconnectBaseDelayMs = AssistantSocketProtocol.toPositiveInt(
    options.reconnectBaseDelayMs,
    DEFAULT_RECONNECT_BASE_DELAY_MS,
  );
  const reconnectMaxDelayMs = AssistantSocketProtocol.toPositiveInt(
    options.reconnectMaxDelayMs,
    DEFAULT_RECONNECT_MAX_DELAY_MS,
  );
  const reconnectMaxAttempts = AssistantSocketProtocol.toPositiveInt(
    options.reconnectMaxAttempts,
    DEFAULT_RECONNECT_MAX_ATTEMPTS,
  );
  const heartbeatIntervalMs = AssistantSocketProtocol.toPositiveInt(
    options.heartbeatIntervalMs,
    DEFAULT_HEARTBEAT_INTERVAL_MS,
  );

  const status = ref<AssistantSocketStatus>("idle");
  const lastError = ref("");
  const transcript = ref<AssistantChatTranscriptEntry[]>([]);

  const pendingQueue = ref<AssistantSocketPayload[]>([]);
  const socket = ref<AssistantChatSocketClient | null>(null);
  const wantsConnection = ref(false);
  const reconnectAttempts = ref(0);

  let reconnectTimer: TimerHandle = null;
  let heartbeatTimer: IntervalHandle = null;

  const isConfigured = computed(() => endpoint.length > 0);
  const pendingCount = computed(() => pendingQueue.value.length);

  const clearReconnectTimer = (): void => {
    if (!reconnectTimer) {
      return;
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const clearHeartbeat = (): void => {
    if (!heartbeatTimer) {
      return;
    }
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };

  const withTranscriptEntry = (entry: AssistantChatTranscriptEntry): void => {
    transcript.value = AssistantChatTranscriptUtils.appendLimited(
      transcript.value,
      entry,
      MAX_TRANSCRIPT_ENTRIES,
    );
  };

  const markDelivered = (id: string): void => {
    transcript.value = AssistantChatTranscriptUtils.markPending(
      transcript.value,
      id,
      false,
    );
  };

  const clearSocketHandlers = (target: AssistantChatSocketClient): void => {
    target.onopen = null;
    target.onclose = null;
    target.onerror = null;
    target.onmessage = null;
  };

  const writeSocket = (
    target: AssistantChatSocketClient,
    payload: AssistantSocketPayload,
  ): void => {
    target.send(AssistantSocketProtocol.payloadToWire(payload));
  };

  const scheduleReconnect = (): void => {
    if (!autoReconnect || !wantsConnection.value || reconnectTimer) {
      return;
    }

    if (reconnectAttempts.value >= reconnectMaxAttempts) {
      status.value = "closed";
      lastError.value = "Limite de reconexoes atingido";
      return;
    }

    const attempt = reconnectAttempts.value;
    const delay = Math.min(
      reconnectMaxDelayMs,
      reconnectBaseDelayMs * 2 ** attempt,
    );
    reconnectAttempts.value += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!wantsConnection.value) {
        return;
      }
      connect();
    }, delay);
  };

  const sendHeartbeat = (): void => {
    const active = socket.value;
    if (!active || active.readyState !== SOCKET_READY_OPEN) {
      return;
    }

    try {
      writeSocket(active, AssistantSocketProtocol.createHeartbeatPayload(now));
    } catch (error) {
      status.value = "error";
      lastError.value = error instanceof Error ? error.message : String(error);
      try {
        active.close(SOCKET_CLOSE_CODE_INTERNAL_ERROR, "assistant-heartbeat-failed");
      } catch {
        socket.value = null;
      }
    }
  };

  const startHeartbeat = (): void => {
    clearHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
  };

  const flushQueue = (): void => {
    const active = socket.value;
    if (!active || active.readyState !== SOCKET_READY_OPEN) {
      return;
    }

    if (pendingQueue.value.length === 0) {
      return;
    }

    const batch = [...pendingQueue.value];
    pendingQueue.value = [];

    for (const payload of batch) {
      try {
        writeSocket(active, payload);
        if (payload.type === "assistant.user.message") {
          markDelivered(payload.id);
        }
      } catch (error) {
        pendingQueue.value = [payload, ...pendingQueue.value];
        status.value = "error";
        lastError.value = error instanceof Error ? error.message : String(error);
        try {
          active.close(SOCKET_CLOSE_CODE_INTERNAL_ERROR, "assistant-send-failed");
        } catch {
          socket.value = null;
        }
        break;
      }
    }
  };

  const handleIncomingWire = (wire: string): void => {
    const parsed = AssistantSocketProtocol.parseIncoming(wire, now);
    if (parsed.kind === "ignore") {
      return;
    }

    if (parsed.kind === "history") {
      transcript.value = AssistantChatTranscriptUtils.mergeHistory(
        transcript.value,
        parsed.items,
        MAX_TRANSCRIPT_ENTRIES,
      );
      return;
    }

    if (parsed.kind === "ack") {
      markDelivered(parsed.id);
      return;
    }

    if (parsed.kind === "stream-chunk") {
      transcript.value = AssistantChatTranscriptUtils.applyStreamChunk(
        transcript.value,
        parsed,
        MAX_TRANSCRIPT_ENTRIES,
      );
      return;
    }

    if (parsed.kind === "stream-end") {
      markDelivered(parsed.id);
      return;
    }

    transcript.value = AssistantChatTranscriptUtils.upsertIncomingMessage(
      transcript.value,
      {
        id: parsed.item.id,
        direction: parsed.item.direction,
        text: parsed.item.text,
        at: parsed.item.at || AssistantSocketProtocol.toSafeTimestamp(now),
        pending: false,
      },
      MAX_TRANSCRIPT_ENTRIES,
    );
  };

  const connect = (): boolean => {
    wantsConnection.value = true;
    clearReconnectTimer();

    if (!isConfigured.value) {
      status.value = "disabled";
      return false;
    }

    const active = socket.value;
    if (active) {
      if (
        active.readyState === SOCKET_READY_CONNECTING ||
        active.readyState === SOCKET_READY_OPEN
      ) {
        return true;
      }
      if (active.readyState === SOCKET_READY_CLOSING) {
        status.value = "connecting";
        return true;
      }
    }

    const token = AssistantSocketProtocol.normalizeText(getAuthToken());
    const resolvedUrl = AssistantSocketProtocol.resolveSocketUrl(endpoint, token);
    if (!resolvedUrl) {
      status.value = "disabled";
      return false;
    }

    try {
      const next = socketFactory(resolvedUrl);
      socket.value = next;
      status.value = "connecting";
      lastError.value = "";

      next.onopen = () => {
        status.value = "open";
        reconnectAttempts.value = 0;
        startHeartbeat();
        flushQueue();
      };

      next.onmessage = (event) => {
        handleIncomingWire(String(event.data ?? ""));
      };

      next.onerror = () => {
        status.value = "error";
        lastError.value = "Erro no websocket";
      };

      next.onclose = (event) => {
        clearSocketHandlers(next);
        clearHeartbeat();
        if (socket.value === next) {
          socket.value = null;
        }

        if (!wantsConnection.value) {
          status.value = "closed";
          return;
        }

        if (event.wasClean) {
          status.value = "closed";
        } else {
          status.value = "error";
          lastError.value = event.reason || "Websocket encerrado inesperadamente";
        }

        scheduleReconnect();
      };

      return true;
    } catch (error) {
      status.value = "error";
      lastError.value = error instanceof Error ? error.message : String(error);
      socket.value = null;
      scheduleReconnect();
      return false;
    }
  };

  const disconnect = (reason: string = DEFAULT_CLOSE_REASON): void => {
    wantsConnection.value = false;
    reconnectAttempts.value = 0;
    clearReconnectTimer();
    clearHeartbeat();

    const active = socket.value;
    if (!active) {
      if (status.value === "connecting" || status.value === "open") {
        status.value = "closed";
      }
      return;
    }

    clearSocketHandlers(active);

    if (
      active.readyState === SOCKET_READY_CONNECTING ||
      active.readyState === SOCKET_READY_OPEN ||
      active.readyState === SOCKET_READY_CLOSING
    ) {
      try {
        status.value = "closing";
        active.close(SOCKET_CLOSE_CODE_NORMAL, reason);
      } catch {
        // no-op
      }
    }

    socket.value = null;
    status.value = "closed";
  };

  const sendUserMessage = (text: string): boolean => {
    const normalized = AssistantSocketProtocol.normalizeText(text);
    if (!normalized) {
      return false;
    }

    const payload = AssistantSocketProtocol.createUserPayload(normalized, now);
    withTranscriptEntry({
      id: payload.id,
      direction: "outgoing",
      text: payload.content,
      at: payload.ts,
      pending: true,
    });

    if (status.value !== "open" && status.value !== "connecting") {
      connect();
    }

    if (socket.value?.readyState === SOCKET_READY_OPEN) {
      try {
        writeSocket(socket.value, payload);
        markDelivered(payload.id);
        return true;
      } catch (error) {
        status.value = "error";
        lastError.value = error instanceof Error ? error.message : String(error);
      }
    }

    pendingQueue.value = AssistantChatTranscriptUtils.appendLimited(
      pendingQueue.value,
      payload,
      MAX_TRANSCRIPT_ENTRIES,
    );
    return true;
  };

  const clearTranscript = (): void => {
    transcript.value = [];
    pendingQueue.value = [];
  };

  const removeTranscriptEntry = (id: string): boolean => {
    const normalizedId = AssistantSocketProtocol.normalizeText(id);
    if (!normalizedId) {
      return false;
    }

    const hasTranscriptEntry = transcript.value.some(
      (entry) => entry.id === normalizedId,
    );
    if (!hasTranscriptEntry) {
      return false;
    }

    transcript.value = transcript.value.filter(
      (entry) => entry.id !== normalizedId,
    );
    pendingQueue.value = pendingQueue.value.filter(
      (payload) =>
        payload.type === "assistant.user.message"
          ? payload.id !== normalizedId
          : true,
    );
    return true;
  };

  return {
    status,
    lastError,
    pendingCount,
    transcript,
    isConfigured,
    connect,
    disconnect,
    sendUserMessage,
    clearTranscript,
    removeTranscriptEntry,
  };
};

export type {
  AssistantChatSocketClient,
  AssistantChatSocketFactory,
  AssistantChatSocketShell,
  AssistantChatSocketShellOptions,
  AssistantChatTranscriptEntry,
  AssistantSocketStatus,
} from "./assistantChat.types";
