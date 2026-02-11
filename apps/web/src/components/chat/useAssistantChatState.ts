import { computed, ref, type ComputedRef, type Ref } from "vue";

export type AssistantChatTrigger = "launcher" | "keyboard" | "auth";

export type AssistantChatState = {
  readonly hasOpenedAtLeastOnce: Ref<boolean>;
  readonly isOpen: Ref<boolean>;
  readonly shouldRenderPopup: ComputedRef<boolean>;
  open: (trigger?: AssistantChatTrigger) => void;
  close: (trigger?: AssistantChatTrigger) => void;
  toggle: (trigger?: AssistantChatTrigger) => void;
};

export const useAssistantChatState = (): AssistantChatState => {
  const isOpen = ref(false);
  const hasOpenedAtLeastOnce = ref(false);

  const open = (_trigger: AssistantChatTrigger = "launcher"): void => {
    if (isOpen.value) {
      return;
    }

    isOpen.value = true;
    hasOpenedAtLeastOnce.value = true;
  };

  const close = (_trigger: AssistantChatTrigger = "launcher"): void => {
    isOpen.value = false;
  };

  const toggle = (trigger: AssistantChatTrigger = "launcher"): void => {
    if (isOpen.value) {
      close(trigger);
      return;
    }

    open(trigger);
  };

  const shouldRenderPopup = computed(
    () => hasOpenedAtLeastOnce.value && isOpen.value,
  );

  return {
    hasOpenedAtLeastOnce,
    isOpen,
    shouldRenderPopup,
    open,
    close,
    toggle,
  };
};
