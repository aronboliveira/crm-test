<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
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
    <BotChatWidget v-if="showChatWidget" />
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
