<script setup lang="ts">
import { useDashboardHome } from "../../assets/scripts/dashboard/useDashboardHome";
const { stats, busy, load } = useDashboardHome();
</script>

<template>
  <section class="card" aria-label="Dashboard home">
    <div class="card-head">
      <h3 class="card-title">Main dashboard</h3>
      <button
        class="btn btn-ghost"
        type="button"
        @click="load"
        :aria-busy="busy"
      >
        Refresh
      </button>
    </div>

    <div
      class="grid gap-3 md:grid-cols-2"
      role="list"
      aria-label="Summary cards"
    >
      <div class="summary-card" role="listitem" :aria-busy="busy">
        <div class="summary-label">Projects</div>
        <div class="summary-value">{{ stats.projects }}</div>
      </div>

      <div class="summary-card" role="listitem" :aria-busy="busy">
        <div class="summary-label">Tasks</div>
        <div class="summary-value">{{ stats.tasks }}</div>
      </div>
    </div>
  </section>
</template>
