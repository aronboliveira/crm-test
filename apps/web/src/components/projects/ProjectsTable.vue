<script setup lang="ts">
import { useProjectsTable } from "../../assets/scripts/projects/useProjectsTable";
import DataTable from "../tables/DataTable.vue";

const { canCreate, create, load, table } = useProjectsTable();
</script>

<template>
  <section class="card" aria-label="Projects view">
    <div class="card-head">
      <h3 class="card-title">Projects</h3>

      <div class="flex gap-2">
        <button
          v-if="canCreate"
          class="btn btn-primary"
          type="button"
          aria-label="Create project"
          @click="create"
        >
          New project
        </button>
        <button class="btn btn-ghost" type="button" @click="load">
          Refresh
        </button>
      </div>
    </div>

    <DataTable :table="table" />
  </section>
</template>
