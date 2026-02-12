import { describe, expect, it, vi } from "vitest";
import {
  useAssistantChatSocketShell,
  type AssistantChatSocketClient,
} from "../src/components/chat/useAssistantChatSocketShell";

class FakeSocket implements AssistantChatSocketClient {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readonly sent: string[] = [];
  readonly closeCalls: Array<{ code?: number; reason?: string }> = [];
  throwOnSend = false;

  send(data: string): void {
    if (this.throwOnSend) {
      throw new Error("send-failed");
    }
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCalls.push({ code, reason });
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  message(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  closeUnexpected(reason = "network-drop"): void {
    this.readyState = 3;
    this.onclose?.({ wasClean: false, reason } as CloseEvent);
  }
}

describe("useAssistantChatSocketShell", () => {
  it("stays disabled when endpoint is missing", () => {
    const shell = useAssistantChatSocketShell({
      endpoint: "",
    });

    expect(shell.connect()).toBe(false);
    expect(shell.isConfigured.value).toBe(false);
    expect(shell.status.value).toBe("disabled");
  });

  it("rejects empty user messages without side effects", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    expect(shell.sendUserMessage("   ")).toBe(false);
    expect(shell.transcript.value).toHaveLength(0);
    expect(shell.pendingCount.value).toBe(0);
  });

  it("queues outbound messages and flushes once socket opens", () => {
    const fake = new FakeSocket();

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
      now: () => "2026-02-11T00:00:00.000Z",
    });

    expect(shell.sendUserMessage("hello from queue")).toBe(true);
    expect(shell.pendingCount.value).toBe(1);
    expect(shell.status.value).toBe("connecting");
    expect(shell.transcript.value[0]?.pending).toBe(true);

    fake.open();

    expect(shell.status.value).toBe("open");
    expect(shell.pendingCount.value).toBe(0);
    expect(fake.sent).toHaveLength(1);
    expect(shell.transcript.value[0]?.pending).toBe(false);
  });

  it("resolves secure websocket URL with auth token", () => {
    const fake = new FakeSocket();
    let resolvedUrl = "";

    const shell = useAssistantChatSocketShell({
      endpoint: "https://api.example.com/ws/assistant/chat",
      getAuthToken: () => "jwt-token",
      socketFactory: (url) => {
        resolvedUrl = url;
        return fake;
      },
    });

    expect(shell.connect()).toBe(true);
    expect(resolvedUrl).toBe(
      "wss://api.example.com/ws/assistant/chat?token=jwt-token",
    );
  });

  it("parses incoming websocket payloads into transcript", () => {
    const fake = new FakeSocket();

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    fake.message(JSON.stringify({ message: "hello client" }));

    const last = shell.transcript.value.at(-1);
    expect(last?.direction).toBe("incoming");
    expect(last?.text).toBe("hello client");
    expect(last?.pending).toBe(false);
  });

  it("parses non-JSON inbound payloads as incoming text", () => {
    const fake = new FakeSocket();

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    fake.message("plain text response");

    const last = shell.transcript.value.at(-1);
    expect(last?.direction).toBe("incoming");
    expect(last?.text).toBe("plain text response");
    expect(last?.pending).toBe(false);
  });

  it("merges history payload entries preserving directions", () => {
    const fake = new FakeSocket();

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    fake.message(
      JSON.stringify({
        type: "assistant.history",
        items: [
          {
            id: "h1",
            direction: "assistant",
            text: "previous reply",
            ts: "2026-02-11T09:00:00.000Z",
          },
          {
            id: "h2",
            direction: "user",
            text: "previous prompt",
            ts: "2026-02-11T09:00:01.000Z",
          },
        ],
      }),
    );

    expect(shell.transcript.value).toHaveLength(2);
    expect(shell.transcript.value[0]?.direction).toBe("incoming");
    expect(shell.transcript.value[1]?.direction).toBe("outgoing");
  });

  it("ignores pong frames and malformed history items", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    fake.message(JSON.stringify({ type: "assistant.pong" }));
    fake.message(
      JSON.stringify({
        type: "assistant.history",
        items: [
          { id: "ok-1", direction: "assistant", text: "valid", ts: "t1" },
          { id: "bad-1", direction: "assistant", text: "   ", ts: "t2" },
        ],
      }),
    );

    expect(shell.transcript.value).toHaveLength(1);
    expect(shell.transcript.value[0]?.id).toBe("ok-1");
  });

  it("deduplicates repeated history ids", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    fake.message(
      JSON.stringify({
        type: "assistant.history",
        items: [
          {
            id: "dup-1",
            direction: "assistant",
            text: "first",
            ts: "2026-02-11T09:00:00.000Z",
          },
        ],
      }),
    );
    fake.message(
      JSON.stringify({
        type: "assistant.history",
        items: [
          {
            id: "dup-1",
            direction: "assistant",
            text: "should-not-duplicate",
            ts: "2026-02-11T09:00:01.000Z",
          },
        ],
      }),
    );

    expect(shell.transcript.value).toHaveLength(1);
    expect(shell.transcript.value[0]?.text).toBe("first");
  });

  it("closes active socket on disconnect", () => {
    const fake = new FakeSocket();

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();
    shell.disconnect("manual-close");

    expect(fake.closeCalls).toHaveLength(1);
    expect(fake.closeCalls[0]?.reason).toBe("manual-close");
    expect(shell.status.value).toBe("closed");
  });

  it("caps transcript and pending queue size under burst load", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
      now: () => "2026-02-11T00:00:00.000Z",
    });

    for (let index = 0; index < 130; index += 1) {
      shell.sendUserMessage(`msg-${index}`);
    }

    expect(shell.transcript.value).toHaveLength(120);
    expect(shell.pendingCount.value).toBe(120);
    expect(shell.transcript.value[0]?.text).toBe("msg-10");
    expect(shell.transcript.value.at(-1)?.text).toBe("msg-129");
  });

  it("keeps pending item and reports error when queue flush send fails", () => {
    const fake = new FakeSocket();
    fake.throwOnSend = true;

    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.sendUserMessage("queued-before-open");
    expect(shell.pendingCount.value).toBe(1);

    fake.open();

    expect(shell.status.value).toBe("error");
    expect(shell.lastError.value).toContain("send-failed");
    expect(shell.pendingCount.value).toBe(1);
    expect(shell.transcript.value[0]?.pending).toBe(true);
    expect(fake.closeCalls[0]?.reason).toBe("assistant-send-failed");
  });

  it("clears transcript and pending queue on clearTranscript", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
      now: () => "2026-02-11T00:00:00.000Z",
    });

    shell.sendUserMessage("primeira");
    shell.sendUserMessage("segunda");

    expect(shell.transcript.value).toHaveLength(2);
    expect(shell.pendingCount.value).toBe(2);

    shell.clearTranscript();

    expect(shell.transcript.value).toHaveLength(0);
    expect(shell.pendingCount.value).toBe(0);
  });

  it("removes a specific transcript entry and its queued payload by id", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
      now: () => "2026-02-11T00:00:00.000Z",
    });

    shell.sendUserMessage("primeira");
    shell.sendUserMessage("segunda");
    const firstId = shell.transcript.value[0]?.id ?? "";
    const secondId = shell.transcript.value[1]?.id ?? "";

    expect(shell.removeTranscriptEntry(secondId)).toBe(true);
    expect(shell.pendingCount.value).toBe(1);
    expect(shell.transcript.value).toHaveLength(1);
    expect(shell.transcript.value[0]?.id).toBe(firstId);
    expect(shell.removeTranscriptEntry("id-ausente")).toBe(false);
    expect(shell.removeTranscriptEntry("   ")).toBe(false);
  });

  it("marks outgoing message as delivered when assistant ack arrives", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
      now: () => "2026-02-11T00:00:00.000Z",
    });

    shell.sendUserMessage("queued message");
    const messageId = shell.transcript.value[0]?.id;
    expect(shell.transcript.value[0]?.pending).toBe(true);

    fake.message(JSON.stringify({ type: "assistant.ack", id: messageId }));

    expect(shell.transcript.value[0]?.pending).toBe(false);
  });

  it("builds streamed incoming assistant message from chunk frames", () => {
    const fake = new FakeSocket();
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      socketFactory: () => fake,
    });

    shell.connect();
    fake.open();

    fake.message(
      JSON.stringify({
        type: "assistant.stream.chunk",
        streamId: "stream-1",
        chunk: "Hello ",
      }),
    );
    fake.message(
      JSON.stringify({
        type: "assistant.stream.chunk",
        streamId: "stream-1",
        chunk: "world",
      }),
    );
    fake.message(
      JSON.stringify({
        type: "assistant.stream.end",
        streamId: "stream-1",
      }),
    );

    expect(shell.transcript.value).toHaveLength(1);
    expect(shell.transcript.value[0]?.id).toBe("stream-1");
    expect(shell.transcript.value[0]?.text).toBe("Hello world");
    expect(shell.transcript.value[0]?.pending).toBe(false);
  });

  it("reconnects after unexpected close when auto reconnect is enabled", () => {
    vi.useFakeTimers();

    try {
      const sockets: FakeSocket[] = [];

      const shell = useAssistantChatSocketShell({
        endpoint: "ws://localhost:4000/chat",
        socketFactory: () => {
          const next = new FakeSocket();
          sockets.push(next);
          return next;
        },
        reconnectBaseDelayMs: 80,
        reconnectMaxDelayMs: 200,
      });

      shell.connect();
      expect(sockets).toHaveLength(1);
      sockets[0]?.open();
      sockets[0]?.closeUnexpected("upstream-reset");

      expect(shell.status.value).toBe("error");
      vi.advanceTimersByTime(79);
      expect(sockets).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(sockets).toHaveLength(2);
      expect(shell.status.value).toBe("connecting");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not reconnect when auto reconnect is disabled", () => {
    vi.useFakeTimers();
    try {
      const sockets: FakeSocket[] = [];
      const shell = useAssistantChatSocketShell({
        endpoint: "ws://localhost:4000/chat",
        socketFactory: () => {
          const next = new FakeSocket();
          sockets.push(next);
          return next;
        },
        autoReconnect: false,
      });

      shell.connect();
      sockets[0]?.open();
      sockets[0]?.closeUnexpected("network-reset");

      vi.advanceTimersByTime(2_000);
      expect(sockets).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops reconnecting when max attempts are exhausted", () => {
    vi.useFakeTimers();
    try {
      const sockets: FakeSocket[] = [];
      const shell = useAssistantChatSocketShell({
        endpoint: "ws://localhost:4000/chat",
        socketFactory: () => {
          const next = new FakeSocket();
          sockets.push(next);
          return next;
        },
        reconnectBaseDelayMs: 10,
        reconnectMaxDelayMs: 20,
        reconnectMaxAttempts: 2,
      });

      shell.connect();
      sockets[0]?.closeUnexpected("first-drop");
      vi.advanceTimersByTime(10);
      sockets[1]?.closeUnexpected("second-drop");
      vi.advanceTimersByTime(20);
      sockets[2]?.closeUnexpected("third-drop");
      vi.advanceTimersByTime(40);

      expect(shell.lastError.value).toContain("Limite de reconexoes atingido");
      expect(shell.status.value).toBe("closed");
      expect(sockets).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends heartbeat frames while socket is open", () => {
    vi.useFakeTimers();

    try {
      const fake = new FakeSocket();
      const shell = useAssistantChatSocketShell({
        endpoint: "ws://localhost:4000/chat",
        socketFactory: () => fake,
        heartbeatIntervalMs: 500,
      });

      shell.connect();
      fake.open();

      expect(fake.sent).toHaveLength(0);
      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(500);

      expect(fake.sent.length).toBeGreaterThanOrEqual(2);
      expect(fake.sent[0]).toContain("assistant.ping");

      shell.disconnect("manual-close");
      const sentBefore = fake.sent.length;
      vi.advanceTimersByTime(1_500);
      expect(fake.sent).toHaveLength(sentBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks socket error when heartbeat send fails", () => {
    vi.useFakeTimers();
    try {
      const fake = new FakeSocket();
      fake.throwOnSend = true;

      const shell = useAssistantChatSocketShell({
        endpoint: "ws://localhost:4000/chat",
        socketFactory: () => fake,
        heartbeatIntervalMs: 300,
      });

      shell.connect();
      fake.open();
      vi.advanceTimersByTime(300);

      expect(shell.status.value).toBe("error");
      expect(shell.lastError.value).toContain("send-failed");
      expect(fake.closeCalls.length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports connect errors when socket factory throws", () => {
    const shell = useAssistantChatSocketShell({
      endpoint: "ws://localhost:4000/chat",
      autoReconnect: false,
      socketFactory: () => {
        throw new Error("factory-failed");
      },
    });

    expect(shell.connect()).toBe(false);
    expect(shell.status.value).toBe("error");
    expect(shell.lastError.value).toContain("factory-failed");
  });
});
