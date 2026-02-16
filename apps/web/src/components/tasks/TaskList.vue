<script setup lang="ts">
import { useTaskList } from "../../assets/scripts/tasks/useTaskList";
import TaskFormModal from "./TaskFormModal.vue";

const { rows, busy, showCreate, load } = useTaskList();
</script>

<template>
  <section class="card" aria-label="Tarefas">
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
          <path d="M8 12l3 3 5-6" />
          <path d="M5 5h14v14H5z" />
        </svg>
        Tarefas
      </h3>
      <button class="btn btn-primary" type="button" @click="showCreate = true">
        Nova
      </button>
    </div>

    <div v-if="busy" class="skeleton" aria-busy="true" aria-live="polite">
      Carregando…
    </div>

    <ul v-else class="list" role="list">
      <li v-for="t in rows" :key="t.id" class="list-item" role="listitem">
        <div class="list-item-main">
          <strong class="list-item-title">{{ t.title }}</strong>
          <span class="badge" :data-status="t.status">{{ t.status }}</span>
        </div>
        <div class="list-item-sub">{{ t.description }}</div>
      </li>
    </ul>

    <TaskFormModal v-model:open="showCreate" @created="load" />
  </section>
</template>
