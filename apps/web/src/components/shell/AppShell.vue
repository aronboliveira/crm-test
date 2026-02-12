<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { useLayout } from "../../assets/scripts/shell/useLayout";
import { useAuthStore } from "../../pinia/stores/auth.store";
import AsideViewNav from "./AsideViewNav.vue";
import TopBar from "./TopBar.vue";
import RowDetailsDrawer from "./RowDetailsDrawer.vue";
import ModalContainer from "./ModalContainer.vue";

const BotChatWidget = defineAsyncComponent(
  () => import("../chat/BotChatWidget.vue"),
);

const authStore = useAuthStore();
const { toggleMobileOpen } = useLayout();
const showChatWidget = computed(() => authStore.isLoggedIn);
const canRenderChatWidget = ref(false);
let chatWidgetDeferredTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (typeof window === "undefined") {
    canRenderChatWidget.value = true;
    return;
  }

  const win = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
  };

  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(
      () => {
        canRenderChatWidget.value = true;
      },
      { timeout: 1400 },
    );
    return;
  }

  chatWidgetDeferredTimer = window.setTimeout(() => {
    canRenderChatWidget.value = true;
  }, 420);
});

onBeforeUnmount(() => {
  if (chatWidgetDeferredTimer) {
    clearTimeout(chatWidgetDeferredTimer);
    chatWidgetDeferredTimer = null;
  }
});
</script>

<template>
  <div class="app-shell" role="application" aria-label="Admin dashboard">
    <AsideViewNav />

    <div class="app-main">
      <TopBar @toggle-aside="toggleMobileOpen" />

      <main class="app-content" role="main" aria-label="Main content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <RowDetailsDrawer />
    <ModalContainer />
    <BotChatWidget v-if="showChatWidget && canRenderChatWidget" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
