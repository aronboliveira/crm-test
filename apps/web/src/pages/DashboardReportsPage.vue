<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const ReportsView = defineAsyncComponent(
  () => import("../components/dashboard/ReportsView.vue"),
);

const goBack = () => router.push("/dashboard");
</script>

<template>
  <div class="reports-page">
    <header class="reports-page__header">
      <button
        class="reports-page__back btn btn-ghost"
        type="button"
        aria-label="Voltar ao painel"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="reports-page__back-icon"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Voltar ao Painel
      </button>
      <h1 class="reports-page__title">Relatórios &amp; Análises</h1>
    </header>

    <Suspense>
      <ReportsView />
      <template #fallback>
        <p class="reports-page__loading">Carregando relatórios…</p>
      </template>
    </Suspense>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/pages/dashboard-reports-page.module";
</style>
