import { describe, expect, it } from "vitest";
import {
  buildVisibleAssistantTranscriptRows,
  toTranscriptSortTimestamp,
} from "../src/components/chat/assistantChatView.utils";
import type { AssistantChatTranscriptEntry } from "../src/components/chat/assistantChat.types";

const row = (
  id: string,
  direction: AssistantChatTranscriptEntry["direction"],
  at: string,
  text = id,
): AssistantChatTranscriptEntry => ({
  id,
  direction,
  at,
  text,
  pending: false,
});

describe("assistantChatView.utils", () => {
  it("keeps only outgoing rows from websocket transcript", () => {
    const visible = buildVisibleAssistantTranscriptRows(
      [
        row("in-1", "incoming", "2026-02-11T10:00:00.000Z"),
        row("out-1", "outgoing", "2026-02-11T10:00:01.000Z"),
      ],
      [row("mock-1", "incoming", "2026-02-11T10:00:02.000Z")],
    );

    expect(visible.map((item) => item.id)).toEqual(["out-1", "mock-1"]);
  });

  it("orders rows by timestamp regardless of sender", () => {
    const visible = buildVisibleAssistantTranscriptRows(
      [
        row("out-2", "outgoing", "2026-02-11T10:00:02.000Z"),
        row("out-1", "outgoing", "2026-02-11T10:00:01.000Z"),
      ],
      [row("mock-1", "incoming", "2026-02-11T10:00:01.500Z")],
    );

    expect(visible.map((item) => item.id)).toEqual(["out-1", "mock-1", "out-2"]);
  });

  it("uses stable order for equal timestamps and pushes invalid dates to the end", () => {
    const visible = buildVisibleAssistantTranscriptRows(
      [
        row("out-1", "outgoing", "2026-02-11T10:00:01.000Z"),
        row("out-2", "outgoing", "invalid"),
      ],
      [
        row("mock-1", "incoming", "2026-02-11T10:00:01.000Z"),
        row("mock-2", "incoming", "invalid"),
      ],
    );

    expect(visible.map((item) => item.id)).toEqual([
      "out-1",
      "mock-1",
      "out-2",
      "mock-2",
    ]);
  });

  it("returns fallback sort value for invalid timestamps", () => {
    expect(toTranscriptSortTimestamp("invalid")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

