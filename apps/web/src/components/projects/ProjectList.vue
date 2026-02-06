<script setup lang="ts">
import { useProjectList } from "../../assets/scripts/projects/useProjectList";
const { rows, busy } = useProjectList();
</script>

<template>
  <section class="card" aria-label="Projects">
    <div class="card-head">
      <h3 class="card-title section-title">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" />
          <path d="M4 13h7v7H4z" />
          <path d="M13 13h7v7h-7z" />
        </svg>
        Projects
      </h3>
    </div>

    <div v-if="busy" class="skeleton" aria-busy="true" aria-live="polite">
      Loading…
    </div>

    <ul v-else class="list" role="list">
      <li v-for="p in rows" :key="p.id" class="list-item" role="listitem">
        <div class="list-item-main">
          <strong class="list-item-title">{{ p.name }}</strong>
          <span class="badge" :data-status="p.status">{{ p.status }}</span>
        </div>
        <div class="list-item-sub">{{ p.description }}</div>
      </li>
    </ul>
  </section>
</template>
