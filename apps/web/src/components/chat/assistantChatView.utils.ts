import type { AssistantChatTranscriptEntry } from "./assistantChat.types";

const FALLBACK_SORT_TS = Number.MAX_SAFE_INTEGER;

export const toTranscriptSortTimestamp = (at: string): number => {
  const parsed = Date.parse(String(at ?? ""));
  return Number.isFinite(parsed) ? parsed : FALLBACK_SORT_TS;
};

export const buildVisibleAssistantTranscriptRows = (
  socketTranscript: readonly AssistantChatTranscriptEntry[],
  mockReplies: readonly AssistantChatTranscriptEntry[],
): AssistantChatTranscriptEntry[] => {
  const outgoingSocketRows = socketTranscript.filter(
    (entry) => entry.direction === "outgoing",
  );
  const combined = [...outgoingSocketRows, ...mockReplies];

  return combined
    .map((item, index) => ({
      item,
      index,
      at: toTranscriptSortTimestamp(item.at),
    }))
    .sort((left, right) =>
      left.at === right.at ? left.index - right.index : left.at - right.at,
    )
    .map(({ item }) => item);
};

