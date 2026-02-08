<script setup lang="ts">
import { computed } from "vue";
import { useProjectsStore } from "../../pinia/stores/projects.store";
import type { ProjectRow } from "../../pinia/types/projects.types";

const props = defineProps<{
  filter?: "all" | "active";
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const store = useProjectsStore();

const rows = computed<ProjectRow[]>(() => {
  const all = store.rows.filter((p): p is NonNullable<typeof p> => !!p);
  if (props.filter === "active")
    return all.filter((p) => p.status === "active");
  return all;
});

const title = computed(() =>
  props.filter === "active" ? "Projetos Ativos" : "Todos os Projetos",
);

const statusClass = (s: string) =>
  ({
    planned: "badge--pending",
    active: "badge--active",
    blocked: "badge--blocked",
    done: "badge--done",
    archived: "badge--archived",
  })[s] || "";

const statusLabel = (s: string) =>
  (
    ({
      planned: "Planejado",
      active: "Ativo",
      blocked: "Bloqueado",
      done: "Concluído",
      archived: "Arquivado",
    }) as Record<string, string>
  )[s] || s;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};
</script>

<template>
  <div class="ptm">
    <p class="ptm__count">{{ rows.length }} {{ title.toLowerCase() }}</p>

    <div class="ptm__table-wrap">
      <table class="data-table" v-if="rows.length">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Status</th>
            <th>Responsável</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td class="td-strong">{{ p.code }}</td>
            <td>{{ p.name }}</td>
            <td>
              <span :class="['badge', statusClass(p.status)]">{{
                statusLabel(p.status)
              }}</span>
            </td>
            <td class="td-muted">{{ p.ownerEmail }}</td>
            <td class="td-muted">{{ fmtDate(p.dueAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="ptm__empty">Nenhum projeto encontrado.</p>
    </div>

    <footer class="ptm__footer">
      <button class="btn btn-secondary" type="button" @click="emit('close')">
        Fechar
      </button>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.ptm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ptm__count {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.ptm__table-wrap {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
}

.ptm__empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.ptm__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-1);
}

.badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 600;
}

.badge--pending {
  background: var(--warning-soft);
  color: var(--warning);
}
.badge--active {
  background: var(--success-soft);
  color: var(--success);
}
.badge--blocked {
  background: var(--danger-soft);
  color: var(--danger);
}
.badge--done {
  background: var(--info-soft);
  color: var(--info);
}
.badge--archived {
  background: var(--surface-3);
  color: var(--text-muted);
}
</style>
