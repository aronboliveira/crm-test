<script setup lang="ts">
import { useLayout } from "../../assets/scripts/shell/useLayout";
import AsideViewNav from "./AsideViewNav.vue";
import TopBar from "./TopBar.vue";
import RowDetailsDrawer from "./RowDetailsDrawer.vue";
import ModalContainer from "./ModalContainer.vue";

const { toggleMobileOpen } = useLayout();
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
