import { describe, expect, it } from "vitest";
import FormValidationStateService from "../src/services/FormValidationStateService";

describe("FormValidationStateService", () => {
  it("keeps untouched required field neutral until interaction", () => {
    const state = new FormValidationStateService({
      name: { required: true, normalize: (value) => String(value || "").trim() },
    });

    const classMap = state.classMap("name", "");

    expect(classMap["is-pristine"]).toBe(true);
    expect(classMap["is-untouched"]).toBe(true);
    expect(classMap["is-invalid"]).toBe(false);
    expect(classMap["is-valid"]).toBe(false);
  });

  it("marks required field invalid only after touch/submission and valid after content", () => {
    const state = new FormValidationStateService({
      name: { required: true, normalize: (value) => String(value || "").trim() },
    });

    state.markTouched("name");
    expect(state.classMap("name", "")["is-invalid"]).toBe(true);

    state.handleInput("name", "Notebook de suporte");
    expect(state.classMap("name", "Notebook de suporte")["is-valid"]).toBe(true);

    state.hydrate({ name: "" });
    state.markSubmitted();
    expect(state.classMap("name", "")["is-invalid"]).toBe(true);
  });
});

