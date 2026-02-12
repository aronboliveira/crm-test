import type { AssistantChatDirection, AssistantChatTranscriptEntry } from "./assistantChat.types";

const MAX_PERSISTED_MOCK_REPLIES = 120;
const MAX_PERSISTED_HIDDEN_IDS = 240;

export const ASSISTANT_CHAT_WIDGET_PERSIST_KEY =
  "assistant.chat.widget.state.v1";

export type AssistantChatWidgetPersistedState = Readonly<{
  mockReplies: AssistantChatTranscriptEntry[];
  hiddenMessageIds: string[];
  historyClearedAt: string;
}>;

export const createAssistantChatWidgetPersistedState =
  (): AssistantChatWidgetPersistedState => ({
    mockReplies: [],
    hiddenMessageIds: [],
    historyClearedAt: "",
  });

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeDirection = (value: unknown): AssistantChatDirection | null => {
  const direction = normalizeText(value);
  if (direction === "incoming" || direction === "outgoing") {
    return direction;
  }
  return null;
};

const sanitizeTranscriptEntry = (
  value: unknown,
): AssistantChatTranscriptEntry | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const id = normalizeText(source.id);
  const direction = normalizeDirection(source.direction);
  const text = normalizeText(source.text);
  const at = normalizeText(source.at);

  if (!id || !direction || !text || !at) {
    return null;
  }

  return {
    id,
    direction,
    text,
    at,
    pending: false,
  };
};

const sanitizeTranscriptEntries = (
  value: unknown,
  maxSize: number,
): AssistantChatTranscriptEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = value
    .map((entry) => sanitizeTranscriptEntry(entry))
    .filter((entry): entry is AssistantChatTranscriptEntry => !!entry);

  return items.slice(-maxSize);
};

const sanitizeHiddenIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const item of value) {
    const id = normalizeText(item);
    if (!id) {
      continue;
    }
    deduped.add(id);
    if (deduped.size >= MAX_PERSISTED_HIDDEN_IDS) {
      break;
    }
  }

  return Array.from(deduped);
};

export const sanitizeAssistantChatWidgetPersistedState = (
  value: unknown,
): AssistantChatWidgetPersistedState => {
  if (typeof value !== "object" || value === null) {
    return createAssistantChatWidgetPersistedState();
  }

  const source = value as Record<string, unknown>;
  const mockReplies = sanitizeTranscriptEntries(
    source.mockReplies,
    MAX_PERSISTED_MOCK_REPLIES,
  ).filter((entry) => entry.direction === "incoming");

  return {
    mockReplies,
    hiddenMessageIds: sanitizeHiddenIds(source.hiddenMessageIds),
    historyClearedAt: normalizeText(source.historyClearedAt),
  };
};

export const toTimestampOrNull = (value: string): number | null => {
  const parsed = Date.parse(normalizeText(value));
  return Number.isFinite(parsed) ? parsed : null;
};

