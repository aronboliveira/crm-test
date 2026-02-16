<script setup lang="ts">
import { useTasksTable } from "../../assets/scripts/tasks/useTasksTable";
import DataTable from "../tables/DataTable.vue";

const { canCreate, create, load, table } = useTasksTable();
</script>

<template>
  <section class="card" aria-label="Visão de tarefas">
    <div class="card-head">
      <h3 class="card-title">Tarefas</h3>

      <div class="flex gap-2">
        <button
          v-if="canCreate"
          class="btn btn-primary"
          type="button"
          aria-label="Criar tarefa"
          @click="create"
        >
          Nova tarefa
        </button>
        <button class="btn btn-ghost" type="button" @click="load">
          Atualizar
        </button>
      </div>
    </div>

    <DataTable :table="table" />
  </section>
</template>
