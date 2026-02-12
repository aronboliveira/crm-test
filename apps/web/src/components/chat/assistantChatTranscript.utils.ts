import type {
  AssistantChatDirection,
  AssistantChatTranscriptEntry,
} from "./assistantChat.types";
import type { AssistantHistoryIncomingItem } from "./assistantChatSocket.protocol";

export class AssistantChatTranscriptUtils {
  static appendLimited<T>(
    items: readonly T[],
    item: T,
    maxEntries: number,
  ): T[] {
    if (items.length < maxEntries) {
      return [...items, item];
    }
    return [...items.slice(items.length - maxEntries + 1), item];
  }

  static markPending(
    items: readonly AssistantChatTranscriptEntry[],
    id: string,
    pending: boolean,
  ): AssistantChatTranscriptEntry[] {
    return items.map((entry) =>
      entry.id === id ? { ...entry, pending } : entry,
    );
  }

  static mergeHistory(
    items: readonly AssistantChatTranscriptEntry[],
    history: readonly AssistantHistoryIncomingItem[],
    maxEntries: number,
  ): AssistantChatTranscriptEntry[] {
    let next = [...items];
    for (const item of history) {
      if (next.some((entry) => entry.id === item.id)) {
        continue;
      }
      next = AssistantChatTranscriptUtils.appendLimited(
        next,
        {
          id: item.id,
          direction: item.direction,
          text: item.text,
          at: item.at,
          pending: false,
        },
        maxEntries,
      );
    }
    return next;
  }

  static applyStreamChunk(
    items: readonly AssistantChatTranscriptEntry[],
    input: Readonly<{ id: string; text: string; at: string }>,
    maxEntries: number,
  ): AssistantChatTranscriptEntry[] {
    let matched = false;
    const next = items.map((entry) => {
      if (entry.id !== input.id || entry.direction !== "incoming") {
        return entry;
      }
      matched = true;
      return {
        ...entry,
        text: `${entry.text}${input.text}`,
        at: input.at,
        pending: true,
      };
    });

    if (matched) {
      return next;
    }

    return AssistantChatTranscriptUtils.appendLimited(
      next,
      {
        id: input.id,
        direction: "incoming",
        text: input.text,
        at: input.at,
        pending: true,
      },
      maxEntries,
    );
  }

  static upsertIncomingMessage(
    items: readonly AssistantChatTranscriptEntry[],
    input: Readonly<{
      id: string;
      direction: AssistantChatDirection;
      text: string;
      at: string;
      pending: boolean;
    }>,
    maxEntries: number,
  ): AssistantChatTranscriptEntry[] {
    const existingIndex = items.findIndex((entry) => entry.id === input.id);
    if (existingIndex === -1) {
      return AssistantChatTranscriptUtils.appendLimited(
        items,
        {
          id: input.id,
          direction: input.direction,
          text: input.text,
          at: input.at,
          pending: input.pending,
        },
        maxEntries,
      );
    }

    return items.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            direction: input.direction,
            text: input.text,
            at: input.at,
            pending: input.pending,
          }
        : entry,
    );
  }
}
