import { describe, expect, it } from "vitest";
import { createCssModuleClassMemo } from "../src/components/chat/styleMemo";
import { useAssistantChatState } from "../src/components/chat/useAssistantChatState";

describe("Assistant chat state", () => {
  it("starts closed and unopened", () => {
    const state = useAssistantChatState();

    expect(state.isOpen.value).toBe(false);
    expect(state.hasOpenedAtLeastOnce.value).toBe(false);
    expect(state.shouldRenderPopup.value).toBe(false);
  });

  it("opens lazily and closes without losing activation memory", () => {
    const state = useAssistantChatState();

    state.open();

    expect(state.isOpen.value).toBe(true);
    expect(state.hasOpenedAtLeastOnce.value).toBe(true);
    expect(state.shouldRenderPopup.value).toBe(true);

    state.close();

    expect(state.isOpen.value).toBe(false);
    expect(state.hasOpenedAtLeastOnce.value).toBe(true);
    expect(state.shouldRenderPopup.value).toBe(false);
  });

  it("toggles open state deterministically", () => {
    const state = useAssistantChatState();

    state.toggle();
    expect(state.isOpen.value).toBe(true);

    state.toggle();
    expect(state.isOpen.value).toBe(false);
  });
});

describe("CSS module class memo", () => {
  it("returns stable class names for repeated lookups", () => {
    const classes = createCssModuleClassMemo({
      root: "root_hash",
      active: "active_hash",
    });

    const first = classes(["root", "active"]);
    const second = classes(["root", "active"]);

    expect(first).toBe("root_hash active_hash");
    expect(second).toBe("root_hash active_hash");
    expect(first).toBe(second);
  });

  it("drops unknown tokens without throwing", () => {
    const classes = createCssModuleClassMemo({
      root: "root_hash",
    });

    expect(classes(["root", "missing"])).toBe("root_hash");
    expect(classes(["missing"])).toBe("");
  });
});
