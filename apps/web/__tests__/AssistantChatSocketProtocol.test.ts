import { describe, expect, it } from "vitest";
import { AssistantSocketProtocol } from "../src/components/chat/assistantChatSocket.protocol";

describe("AssistantSocketProtocol", () => {
  it("normalizes positive integer values with fallback", () => {
    expect(AssistantSocketProtocol.toPositiveInt(10.9, 3)).toBe(10);
    expect(AssistantSocketProtocol.toPositiveInt(0, 3)).toBe(3);
    expect(AssistantSocketProtocol.toPositiveInt("bad", 3)).toBe(3);
  });

  it("resolves websocket URL and appends token", () => {
    const resolved = AssistantSocketProtocol.resolveSocketUrl(
      "https://api.example.com/ws/assistant/chat",
      "jwt",
    );

    expect(resolved).toBe("wss://api.example.com/ws/assistant/chat?token=jwt");
  });

  it("parses plain text wire payload as message event", () => {
    const parsed = AssistantSocketProtocol.parseIncoming("hello");

    expect(parsed.kind).toBe("message");
    if (parsed.kind !== "message") {
      return;
    }
    expect(parsed.item.text).toBe("hello");
    expect(parsed.item.direction).toBe("incoming");
  });

  it("parses assistant history and filters invalid rows", () => {
    const parsed = AssistantSocketProtocol.parseIncoming(
      JSON.stringify({
        type: "assistant.history",
        items: [
          { id: "h1", direction: "assistant", text: "valid", ts: "t1" },
          { id: "h2", direction: "assistant", text: "   ", ts: "t2" },
        ],
      }),
    );

    expect(parsed.kind).toBe("history");
    if (parsed.kind !== "history") {
      return;
    }
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.id).toBe("h1");
  });

  it("parses stream chunk and stream end events", () => {
    const chunk = AssistantSocketProtocol.parseIncoming(
      JSON.stringify({
        type: "assistant.stream.chunk",
        streamId: "s-1",
        chunk: "hi",
        ts: "now",
      }),
    );
    const done = AssistantSocketProtocol.parseIncoming(
      JSON.stringify({
        type: "assistant.stream.end",
        streamId: "s-1",
      }),
    );

    expect(chunk.kind).toBe("stream-chunk");
    if (chunk.kind === "stream-chunk") {
      expect(chunk.id).toBe("s-1");
      expect(chunk.text).toBe("hi");
    }
    expect(done.kind).toBe("stream-end");
  });

  it("parses assistant error payload as incoming message", () => {
    const parsed = AssistantSocketProtocol.parseIncoming(
      JSON.stringify({
        type: "assistant.error",
        reason: "transport unavailable",
      }),
    );

    expect(parsed.kind).toBe("message");
    if (parsed.kind !== "message") {
      return;
    }
    expect(parsed.item.text).toBe("transport unavailable");
  });

  it("parses ack payload", () => {
    const parsed = AssistantSocketProtocol.parseIncoming(
      JSON.stringify({
        type: "assistant.ack",
        id: "m-1",
      }),
    );

    expect(parsed).toEqual({ kind: "ack", id: "m-1" });
  });

  it("throws when payload serialization fails", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      AssistantSocketProtocol.payloadToWire(circular as any),
    ).toThrow("Failed to serialize assistant socket payload");
  });
});
