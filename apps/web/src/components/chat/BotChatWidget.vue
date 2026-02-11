<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from "vue";
import { useAuthStore } from "../../pinia/stores/auth.store";
import { useAssistantChatState } from "./useAssistantChatState";

const POPUP_ID = "crm-assistant-chat-popup";

const BotChatLauncher = defineAsyncComponent(
  () => import("./BotChatLauncher.vue"),
);

const BotChatPopup = defineAsyncComponent(() => import("./BotChatPopup.vue"));

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isLoggedIn);

const { close, isOpen, shouldRenderPopup, toggle } = useAssistantChatState();

watch(
  isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      return;
    }

    close("auth");
  },
  { flush: "sync" },
);

const handleToggle = (): void => {
  toggle("launcher");
};

const handleClose = (): void => {
  close("launcher");
};

const handleEscape = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") {
    return;
  }

  close("keyboard");
};
</script>

<template>
  <div
    v-if="isAuthenticated"
    class="assistant-widget-layer"
    @keydown.capture="handleEscape"
  >
    <BotChatLauncher :open="isOpen" :popup-id="POPUP_ID" @toggle="handleToggle" />
    <BotChatPopup
      v-if="shouldRenderPopup"
      :open="isOpen"
      :popup-id="POPUP_ID"
      @close="handleClose"
    />
  </div>
</template>

<style scoped lang="scss">
.assistant-widget-layer {
  pointer-events: none;
}
</style>
