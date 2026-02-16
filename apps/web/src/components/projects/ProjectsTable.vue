<script setup lang="ts">
import { useProjectsTable } from "../../assets/scripts/projects/useProjectsTable";
import DataTable from "../tables/DataTable.vue";

const { canCreate, create, load, table } = useProjectsTable();
</script>

<template>
  <section class="card" aria-label="Visão de projetos">
    <div class="card-head">
      <h3 class="card-title">Projetos</h3>

      <div class="flex gap-2">
        <button
          v-if="canCreate"
          class="btn btn-primary"
          type="button"
          aria-label="Criar projeto"
          @click="create"
        >
          Novo projeto
        </button>
        <button class="btn btn-ghost" type="button" @click="load">
          Atualizar
        </button>
      </div>
    </div>

    <DataTable :table="table" />
  </section>
</template>
