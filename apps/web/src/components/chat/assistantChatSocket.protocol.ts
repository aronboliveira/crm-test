import type { AssistantChatDirection } from "./assistantChat.types";
import SafeJsonService from "../../services/SafeJsonService";

export type AssistantSocketUserPayload = Readonly<{
  type: "assistant.user.message";
  id: string;
  content: string;
  ts: string;
}>;

export type AssistantSocketHeartbeatPayload = Readonly<{
  type: "assistant.ping";
  ts: string;
}>;

export type AssistantSocketPayload =
  | AssistantSocketUserPayload
  | AssistantSocketHeartbeatPayload;

export type AssistantHistoryIncomingItem = Readonly<{
  id: string;
  direction: AssistantChatDirection;
  text: string;
  at: string;
}>;

export type AssistantIncomingEvent =
  | Readonly<{ kind: "message"; item: AssistantHistoryIncomingItem }>
  | Readonly<{ kind: "history"; items: AssistantHistoryIncomingItem[] }>
  | Readonly<{ kind: "ack"; id: string }>
  | Readonly<{ kind: "stream-chunk"; id: string; text: string; at: string }>
  | Readonly<{ kind: "stream-end"; id: string }>
  | Readonly<{ kind: "ignore" }>;

type ParsedObject = {
  type?: unknown;
  id?: unknown;
  streamId?: unknown;
  messageId?: unknown;
  direction?: unknown;
  items?: unknown;
  ts?: unknown;
  at?: unknown;
  message?: unknown;
  content?: unknown;
  text?: unknown;
  reason?: unknown;
  chunk?: unknown;
  delta?: unknown;
};

const defaultNow = (): string => new Date().toISOString();

export class AssistantSocketProtocol {
  static normalizeText(value: unknown): string {
    return String(value ?? "").trim();
  }

  static toPositiveInt(value: unknown, fallback: number): number {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) {
      return fallback;
    }
    return Math.floor(next);
  }

  static createId(): string {
    try {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        return crypto.randomUUID();
      }
    } catch {
      // no-op
    }
    return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  static toSafeTimestamp(now: () => string): string {
    try {
      return now();
    } catch {
      return defaultNow();
    }
  }

  static resolveSocketUrl(endpoint: string, token: string): string {
    const target = endpoint.trim();
    if (!target) {
      return "";
    }

    try {
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost";
      const parsed = new URL(target, base);
      if (parsed.protocol === "http:") {
        parsed.protocol = "ws:";
      } else if (parsed.protocol === "https:") {
        parsed.protocol = "wss:";
      }
      if (token) {
        parsed.searchParams.set("token", token);
      }
      return parsed.toString();
    } catch {
      return target;
    }
  }

  static createUserPayload(text: string, now: () => string): AssistantSocketUserPayload {
    return {
      type: "assistant.user.message",
      id: AssistantSocketProtocol.createId(),
      content: text,
      ts: AssistantSocketProtocol.toSafeTimestamp(now),
    };
  }

  static createHeartbeatPayload(now: () => string): AssistantSocketHeartbeatPayload {
    return {
      type: "assistant.ping",
      ts: AssistantSocketProtocol.toSafeTimestamp(now),
    };
  }

  static payloadToWire(payload: AssistantSocketPayload): string {
    const serialized = SafeJsonService.tryStringify(payload);
    if (!serialized) {
      throw new Error("Failed to serialize assistant socket payload");
    }
    return serialized;
  }

  static parseIncoming(
    wire: string,
    now: () => string = defaultNow,
  ): AssistantIncomingEvent {
    if (!wire) {
      return { kind: "ignore" };
    }

    try {
      const parsed = JSON.parse(wire) as string | ParsedObject;

      if (typeof parsed === "string") {
        const text = AssistantSocketProtocol.normalizeText(parsed);
        return text
          ? {
              kind: "message",
              item: {
                id: `incoming-${AssistantSocketProtocol.createId()}`,
                direction: "incoming",
                text,
                at: AssistantSocketProtocol.toSafeTimestamp(now),
              },
            }
          : { kind: "ignore" };
      }

      return AssistantSocketProtocol.parseIncomingObject(parsed, now);
    } catch {
      const text = AssistantSocketProtocol.normalizeText(wire);
      return text
        ? {
            kind: "message",
            item: {
              id: `incoming-${AssistantSocketProtocol.createId()}`,
              direction: "incoming",
              text,
              at: AssistantSocketProtocol.toSafeTimestamp(now),
            },
          }
        : { kind: "ignore" };
    }
  }

  private static parseIncomingObject(
    parsed: ParsedObject,
    now: () => string,
  ): AssistantIncomingEvent {
    const type = AssistantSocketProtocol.normalizeText(parsed.type);
    if (AssistantSocketProtocol.isIgnoredFrame(type)) {
      return { kind: "ignore" };
    }

    if (type === "assistant.history" && Array.isArray(parsed.items)) {
      const items = parsed.items
        .filter((item) => typeof item === "object" && item !== null)
        .map((item) =>
          AssistantSocketProtocol.toHistoryItem(item as Record<string, unknown>, now),
        )
        .filter((item): item is AssistantHistoryIncomingItem => !!item);

      return items.length > 0 ? { kind: "history", items } : { kind: "ignore" };
    }

    if (type === "assistant.ack" || type === "assistant.user.ack") {
      const id = AssistantSocketProtocol.normalizeText(parsed.id ?? parsed.messageId);
      return id ? { kind: "ack", id } : { kind: "ignore" };
    }

    if (
      type === "assistant.stream.chunk" ||
      type === "assistant.message.chunk"
    ) {
      const id = AssistantSocketProtocol.resolveStreamId(parsed);
      const rawChunk = String(
        parsed.chunk ?? parsed.delta ?? parsed.text ?? parsed.content ?? "",
      );
      const hasChunkContent = rawChunk.trim().length > 0;
      const at =
        AssistantSocketProtocol.normalizeText(parsed.ts ?? parsed.at) ||
        AssistantSocketProtocol.toSafeTimestamp(now);
      return id && hasChunkContent
        ? { kind: "stream-chunk", id, text: rawChunk, at }
        : { kind: "ignore" };
    }

    if (
      type === "assistant.stream.end" ||
      type === "assistant.stream.done" ||
      type === "assistant.message.done"
    ) {
      const id = AssistantSocketProtocol.resolveStreamId(parsed);
      return id ? { kind: "stream-end", id } : { kind: "ignore" };
    }

    if (type === "assistant.error") {
      const text = AssistantSocketProtocol.normalizeText(
        parsed.reason ?? parsed.message ?? parsed.content,
      );
      if (!text) {
        return { kind: "ignore" };
      }
      return {
        kind: "message",
        item: {
          id: AssistantSocketProtocol.normalizeText(parsed.id) ||
            `incoming-${AssistantSocketProtocol.createId()}`,
          direction: "incoming",
          text,
          at:
            AssistantSocketProtocol.normalizeText(parsed.ts ?? parsed.at) ||
            AssistantSocketProtocol.toSafeTimestamp(now),
        },
      };
    }

    const item = AssistantSocketProtocol.toHistoryItem(parsed as Record<string, unknown>, now);
    return item ? { kind: "message", item } : { kind: "ignore" };
  }

  private static resolveStreamId(parsed: ParsedObject): string {
    return AssistantSocketProtocol.normalizeText(
      parsed.streamId ?? parsed.messageId ?? parsed.id,
    );
  }

  private static isIgnoredFrame(type: string): boolean {
    return (
      type === "assistant.pong" ||
      type === "assistant.ping" ||
      type === "pong"
    );
  }

  private static mapDirection(direction: string): AssistantChatDirection {
    return direction === "user" || direction === "outgoing"
      ? "outgoing"
      : "incoming";
  }

  private static toHistoryItem(
    raw: Record<string, unknown>,
    now: () => string,
  ): AssistantHistoryIncomingItem | null {
    const text = AssistantSocketProtocol.normalizeText(
      raw.text ?? raw.message ?? raw.content,
    );
    if (!text) {
      return null;
    }

    const id =
      AssistantSocketProtocol.normalizeText(raw.id) ||
      `incoming-${AssistantSocketProtocol.createId()}`;
    const at =
      AssistantSocketProtocol.normalizeText(raw.ts ?? raw.at) ||
      AssistantSocketProtocol.toSafeTimestamp(now);
    const direction = AssistantSocketProtocol.mapDirection(
      AssistantSocketProtocol.normalizeText(raw.direction),
    );

    return {
      id,
      direction,
      text,
      at,
    };
  }
}
