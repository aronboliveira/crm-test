import { describe, expect, it } from "vitest";
import {
  createAssistantChatWidgetPersistedState,
  sanitizeAssistantChatWidgetPersistedState,
  toTimestampOrNull,
} from "../src/components/chat/assistantChatPersistence.utils";

describe("assistantChatPersistence.utils", () => {
  it("returns default state for invalid payloads", () => {
    const next = sanitizeAssistantChatWidgetPersistedState(null);

    expect(next).toEqual(createAssistantChatWidgetPersistedState());
  });

  it("sanitizes persisted state with only valid entries", () => {
    const next = sanitizeAssistantChatWidgetPersistedState({
      mockReplies: [
        {
          id: "m-1",
          direction: "incoming",
          text: "ok",
          at: "2026-02-11T15:00:00.000Z",
          pending: true,
        },
        {
          id: "m-2",
          direction: "outgoing",
          text: "drop",
          at: "2026-02-11T15:00:01.000Z",
          pending: false,
        },
        {
          id: "",
          direction: "incoming",
          text: "invalid",
          at: "2026-02-11T15:00:02.000Z",
          pending: false,
        },
      ],
      hiddenMessageIds: ["a", "", "a", "b"],
      historyClearedAt: " 2026-02-11T15:10:00.000Z ",
    });

    expect(next.mockReplies).toHaveLength(1);
    expect(next.mockReplies[0]?.id).toBe("m-1");
    expect(next.mockReplies[0]?.pending).toBe(false);
    expect(next.hiddenMessageIds).toEqual(["a", "b"]);
    expect(next.historyClearedAt).toBe("2026-02-11T15:10:00.000Z");
  });

  it("parses valid timestamps and rejects invalid ones", () => {
    expect(toTimestampOrNull("2026-02-11T15:00:00.000Z")).not.toBeNull();
    expect(toTimestampOrNull("invalid")).toBeNull();
  });
});

