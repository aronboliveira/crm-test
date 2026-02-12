import { describe, expect, it } from "vitest";
import { AssistantChatTranscriptUtils } from "../src/components/chat/assistantChatTranscript.utils";

describe("AssistantChatTranscriptUtils", () => {
  it("caps appended entries by max", () => {
    const initial = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const next = AssistantChatTranscriptUtils.appendLimited(initial, { id: "d" }, 3);

    expect(next).toEqual([{ id: "b" }, { id: "c" }, { id: "d" }]);
  });

  it("marks pending status by id", () => {
    const next = AssistantChatTranscriptUtils.markPending(
      [
        { id: "m1", direction: "outgoing", text: "x", at: "1", pending: true },
        { id: "m2", direction: "incoming", text: "y", at: "2", pending: false },
      ],
      "m1",
      false,
    );

    expect(next[0]?.pending).toBe(false);
    expect(next[1]?.pending).toBe(false);
  });

  it("merges history while avoiding duplicate ids", () => {
    const next = AssistantChatTranscriptUtils.mergeHistory(
      [{ id: "h1", direction: "incoming", text: "existing", at: "1", pending: false }],
      [
        { id: "h1", direction: "incoming", text: "dup", at: "2" },
        { id: "h2", direction: "outgoing", text: "new", at: "3" },
      ],
      10,
    );

    expect(next).toHaveLength(2);
    expect(next[1]?.id).toBe("h2");
  });

  it("applies stream chunks by creating then appending on same id", () => {
    const afterFirst = AssistantChatTranscriptUtils.applyStreamChunk(
      [],
      { id: "s1", text: "Hello ", at: "1" },
      10,
    );
    const afterSecond = AssistantChatTranscriptUtils.applyStreamChunk(
      afterFirst,
      { id: "s1", text: "world", at: "2" },
      10,
    );

    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]?.text).toBe("Hello world");
    expect(afterSecond[0]?.pending).toBe(true);
  });

  it("upserts incoming messages by id", () => {
    const afterFirst = AssistantChatTranscriptUtils.upsertIncomingMessage(
      [],
      {
        id: "m1",
        direction: "incoming",
        text: "First",
        at: "1",
        pending: false,
      },
      10,
    );
    const afterSecond = AssistantChatTranscriptUtils.upsertIncomingMessage(
      afterFirst,
      {
        id: "m1",
        direction: "incoming",
        text: "Updated",
        at: "2",
        pending: false,
      },
      10,
    );

    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]?.text).toBe("Updated");
  });
});
