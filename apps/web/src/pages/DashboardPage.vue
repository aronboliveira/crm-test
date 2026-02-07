<script setup lang="ts">
import DashboardHome from "../components/dashboard/DashboardHome.vue";
</script>

<template>
  <main class="dashboard-page" aria-label="Dashboard">
    <DashboardHome />
  </main>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}
</style>
