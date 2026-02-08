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
.reports-page {
  width: 100%;
  max-width: var(--content-max-width, 1280px);
  box-sizing: border-box;
}

.reports-page__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.reports-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-2);
  transition: color 0.15s ease;

  &:hover {
    color: var(--primary);
  }
}

.reports-page__back-icon {
  width: 1rem;
  height: 1rem;
}

.reports-page__title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-1);
}

.reports-page__loading {
  padding: 4rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
