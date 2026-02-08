<script setup lang="ts">
import { computed } from "vue";
import { useTasksStore } from "../../pinia/stores/tasks.store";
import type { TaskRow } from "../../pinia/types/tasks.types";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const store = useTasksStore();

const rows = computed<TaskRow[]>(() =>
  store.rows.filter((t): t is NonNullable<typeof t> => !!t),
);

const statusClass = (s: string) =>
  ({
    todo: "badge--todo",
    doing: "badge--doing",
    blocked: "badge--blocked",
    done: "badge--done",
    archived: "badge--archived",
  })[s] || "";

const statusLabel = (s: string) =>
  ({
    todo: "A Fazer",
    doing: "Em Progresso",
    blocked: "Bloqueado",
    done: "Concluído",
    archived: "Arquivado",
  } as Record<string, string>)[s] || s;

const priorityLabel = (p: number) =>
  ({ 1: "Crítica", 2: "Alta", 3: "Média", 4: "Baixa", 5: "Mínima" })[p] || "—";

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
  <div class="ttm">
    <p class="ttm__count">{{ rows.length }} tarefas no total</p>

    <div class="ttm__table-wrap">
      <table class="data-table" v-if="rows.length">
        <thead>
          <tr>
            <th>Título</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Responsável</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td class="td-strong">{{ t.title }}</td>
            <td>
              <span :class="['badge', statusClass(t.status)]">{{
                statusLabel(t.status)
              }}</span>
            </td>
            <td>{{ priorityLabel(t.priority) }}</td>
            <td class="td-muted">{{ t.assigneeEmail }}</td>
            <td class="td-muted">{{ fmtDate(t.dueAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="ttm__empty">Nenhuma tarefa encontrada.</p>
    </div>

    <footer class="ttm__footer">
      <button class="btn btn-secondary" type="button" @click="emit('close')">
        Fechar
      </button>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.ttm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ttm__count {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.ttm__table-wrap {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
}

.ttm__empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.ttm__footer {
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

.badge--todo {
  background: var(--surface-3);
  color: var(--text-2);
}
.badge--doing {
  background: var(--info-soft);
  color: var(--info);
}
.badge--blocked {
  background: var(--danger-soft);
  color: var(--danger);
}
.badge--done {
  background: var(--success-soft);
  color: var(--success);
}
.badge--archived {
  background: var(--surface-3);
  color: var(--text-muted);
}
</style>
