import { ref, markRaw, type Component } from "vue";

export interface ModalOptions {
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closable?: boolean;
  data?: Record<string, unknown>;
}

export interface ModalState {
  isOpen: boolean;
  component: Component | null;
  options: ModalOptions;
}

// Reactive state for the modal
const state = ref<ModalState>({
  isOpen: false,
  component: null,
  options: {},
});

// Promise resolvers for modal results
let resolveModal: ((value: unknown) => void) | null = null;

export default class ModalService {
  static get state() {
    return state;
  }

  static async open<T = unknown>(
    component: Component,
    options: ModalOptions = {},
  ): Promise<T | null> {
    return new Promise((resolve) => {
      resolveModal = resolve as (value: unknown) => void;
      state.value = {
        isOpen: true,
        component: markRaw(component),
        options: {
          closable: true,
          size: "md",
          ...options,
        },
      };
    });
  }

  static close(result?: unknown): void {
    state.value = {
      isOpen: false,
      component: null,
      options: {},
    };
    if (resolveModal) {
      resolveModal(result ?? null);
      resolveModal = null;
    }
  }

  static confirm(result: unknown): void {
    ModalService.close(result);
  }

  static cancel(): void {
    ModalService.close(null);
  }
}
