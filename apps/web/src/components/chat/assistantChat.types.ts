import type { ComputedRef, Ref } from "vue";

export type AssistantSocketStatus =
  | "idle"
  | "disabled"
  | "connecting"
  | "open"
  | "closing"
  | "closed"
  | "error";

export type AssistantChatDirection = "incoming" | "outgoing";

export type AssistantChatTranscriptEntry = Readonly<{
  id: string;
  direction: AssistantChatDirection;
  text: string;
  at: string;
  pending: boolean;
}>;

export type AssistantChatSocketClient = {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
};

export type AssistantChatSocketFactory = (
  url: string,
) => AssistantChatSocketClient;

export type AssistantChatSocketShellOptions = Readonly<{
  endpoint: string;
  getAuthToken?: () => string | null;
  socketFactory?: AssistantChatSocketFactory;
  now?: () => string;
  autoReconnect?: boolean;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectMaxAttempts?: number;
  heartbeatIntervalMs?: number;
}>;

export type AssistantChatSocketShell = Readonly<{
  status: Ref<AssistantSocketStatus>;
  lastError: Ref<string>;
  pendingCount: ComputedRef<number>;
  transcript: Ref<AssistantChatTranscriptEntry[]>;
  isConfigured: ComputedRef<boolean>;
  connect: () => boolean;
  disconnect: (reason?: string) => void;
  sendUserMessage: (text: string) => boolean;
  clearTranscript: () => void;
  removeTranscriptEntry: (id: string) => boolean;
}>;
