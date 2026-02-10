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
      "M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z",
    );
  });

  it("should return correct icon path for visible password", () => {
    const { iconPath, toggleVisibility } = usePasswordVisibility();

    toggleVisibility();

    expect(iconPath.value).toBe(
      "m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z",
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
