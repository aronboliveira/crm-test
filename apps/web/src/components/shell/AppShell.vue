<script setup lang="ts">
import { useAppShell } from "../../assets/scripts/shell/useAppShell";
import AsideViewNav from "./AsideViewNav.vue";
import TopBar from "./TopBar.vue";
import RowDetailsDrawer from "./RowDetailsDrawer.vue";

const { controller, Active, toggleAside } = useAppShell();
</script>

<template>
  <div class="app-shell" role="application" aria-label="Admin dashboard">
    <AsideViewNav :controller="controller" />

    <div class="app-main">
      <TopBar @toggle-aside="toggleAside" />

      <main class="app-content" role="main" aria-label="Main content">
        <section
          class="main-view"
          :aria-label="controller.activeSpec.value.label"
        >
          <component :is="Active" />
        </section>
      </main>
    </div>

    <RowDetailsDrawer />
  </div>
</template>
