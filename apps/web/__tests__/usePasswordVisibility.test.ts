import { describe, it, expect } from "vitest";
import { usePasswordVisibility } from "../src/assets/scripts/auth/usePasswordVisibility";

describe("usePasswordVisibility", () => {
  it("should initialize with password hidden by default", () => {
    const { isVisible, inputType } = usePasswordVisibility();

    expect(isVisible.value).toBe(false);
    expect(inputType.value).toBe("password");
  });

  it("should initialize with custom initial state", () => {
    const { isVisible, inputType } = usePasswordVisibility({
      initialVisible: true,
    });

    expect(isVisible.value).toBe(true);
    expect(inputType.value).toBe("text");
  });

  it("should toggle visibility state", () => {
    const { isVisible, inputType, toggleVisibility } = usePasswordVisibility();

    expect(isVisible.value).toBe(false);
    expect(inputType.value).toBe("password");

    toggleVisibility();

    expect(isVisible.value).toBe(true);
    expect(inputType.value).toBe("text");

    toggleVisibility();

    expect(isVisible.value).toBe(false);
    expect(inputType.value).toBe("password");
  });

  it("should return correct icon path for hidden password", () => {
    const { iconPath } = usePasswordVisibility();

    expect(iconPath.value).toBe(
      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    );
  });

  it("should return correct icon path for visible password", () => {
    const { iconPath, toggleVisibility } = usePasswordVisibility();

    toggleVisibility();

    expect(iconPath.value).toBe(
      "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
    );
  });

  it("should return correct aria-label for hidden password", () => {
    const { ariaLabel } = usePasswordVisibility();

    expect(ariaLabel.value).toBe("Mostrar senha");
  });

  it("should return correct aria-label for visible password", () => {
    const { ariaLabel, toggleVisibility } = usePasswordVisibility();

    toggleVisibility();

    expect(ariaLabel.value).toBe("Ocultar senha");
  });

  it("should maintain reactive state across multiple toggles", () => {
    const { isVisible, inputType, ariaLabel, toggleVisibility } =
      usePasswordVisibility();

    const states: Array<{
      isVisible: boolean;
      inputType: string;
      ariaLabel: string;
    }> = [];

    for (let i = 0; i < 5; i++) {
      toggleVisibility();
      states.push({
        isVisible: isVisible.value,
        inputType: inputType.value,
        ariaLabel: ariaLabel.value,
      });
    }

    expect(states[0]).toEqual({
      isVisible: true,
      inputType: "text",
      ariaLabel: "Ocultar senha",
    });
    expect(states[1]).toEqual({
      isVisible: false,
      inputType: "password",
      ariaLabel: "Mostrar senha",
    });
    expect(states[2]).toEqual({
      isVisible: true,
      inputType: "text",
      ariaLabel: "Ocultar senha",
    });
    expect(states[3]).toEqual({
      isVisible: false,
      inputType: "password",
      ariaLabel: "Mostrar senha",
    });
    expect(states[4]).toEqual({
      isVisible: true,
      inputType: "text",
      ariaLabel: "Ocultar senha",
    });
  });
});
