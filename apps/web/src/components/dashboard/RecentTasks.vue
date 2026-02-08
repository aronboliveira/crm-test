<script setup lang="ts">
import { computed } from "vue";
import type {
  TaskRow,
  TaskStatus,
  TaskPriority,
} from "../../pinia/types/tasks.types";

interface Props {
  tasks: TaskRow[];
  loading?: boolean;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  max: 5,
});

const emit = defineEmits<{
  (e: "view-all"): void;
  (e: "view-task", task: TaskRow): void;
}>();

const displayTasks = computed(() => props.tasks.slice(0, props.max));

const statusColors: Record<TaskStatus, string> = {
  todo: "badge--todo",
  doing: "badge--doing",
  blocked: "badge--blocked",
  done: "badge--done",
  archived: "badge--archived",
};

const priorityLabels: Record<TaskPriority, string> = {
  1: "Crítica",
  2: "Alta",
  3: "Média",
  4: "Baixa",
  5: "Mínima",
};

const priorityClasses: Record<TaskPriority, string> = {
  1: "priority--critical",
  2: "priority--high",
  3: "priority--medium",
  4: "priority--low",
  5: "priority--lowest",
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Sem data de entrega";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d atrasada`;
    if (diffDays === 0) return "Vence hoje";
    if (diffDays === 1) return "Vence amanhã";
    if (diffDays <= 7) return `Vence em ${diffDays}d`;

    return date.toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Data inválida";
  }
};

const isOverdue = (dueAt: string | null, status: TaskStatus): boolean => {
  if (!dueAt || status === "done" || status === "archived") return false;
  try {
    return new Date(dueAt) < new Date();
  } catch {
    return false;
  }
};
</script>

<template>
  <section class="recent-tasks card" aria-label="Tarefas recentes">
    <header class="card-head">
      <h3 class="card-title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="card-title__icon"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Tarefas Recentes
      </h3>
      <button
        v-if="tasks.length > max"
        class="btn btn-ghost btn-sm"
        type="button"
        title="Ver todas as tarefas"
        @click="emit('view-all')"
      >
        Ver Todas ({{ tasks.length }})
      </button>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="tasks-loading"
      role="status"
      aria-label="Carregando tarefas"
    >
      <div v-for="i in 3" :key="i" class="skeleton-row">
        <div class="skeleton-row__left">
          <div class="skeleton skeleton-priority"></div>
          <div class="skeleton skeleton-text" style="width: 70%"></div>
        </div>
        <div class="skeleton skeleton-badge"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!displayTasks.length" class="tasks-empty">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="tasks-empty__icon"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <p class="tasks-empty__text">Nenhuma tarefa ainda</p>
      <p class="tasks-empty__hint">Crie tarefas para acompanhar seu trabalho</p>
    </div>

    <!-- Tasks List -->
    <ul v-else class="tasks-list" role="list">
      <li
        v-for="task in displayTasks"
        :key="task.id"
        class="task-item"
        :class="{ 'task-item--done': task.status === 'done' }"
        role="listitem"
        tabindex="0"
        :title="`${task.title} (${priorityLabels[task.priority]}) - Clique para ver detalhes`"
        @click="emit('view-task', task)"
        @keydown.enter="emit('view-task', task)"
      >
        <div class="task-item__left">
          <span
            class="task-item__priority"
            :class="priorityClasses[task.priority]"
            :title="priorityLabels[task.priority]"
          >
            {{ task.priority }}
          </span>
          <span class="task-item__title">{{ task.title }}</span>
        </div>
        <div class="task-item__right">
          <span :class="['badge badge-sm', statusColors[task.status]]">
            {{ task.status }}
          </span>
          <span
            class="task-item__due"
            :class="{
              'task-item__due--overdue': isOverdue(task.dueAt, task.status),
            }"
          >
            {{ formatDate(task.dueAt) }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.recent-tasks {
  min-height: 200px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--success);
  }
}

.tasks-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--surface-2);
  border-radius: var(--radius-md, 12px);

  &__left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }
}

.skeleton-priority {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
}

.skeleton-text {
  height: 1rem;
  border-radius: 4px;
}

.skeleton-badge {
  width: 50px;
  height: 1.25rem;
  border-radius: 999px;
}

.tasks-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;

  &__icon {
    width: 3rem;
    height: 3rem;
    color: var(--text-muted);
    opacity: 0.5;
    margin-bottom: 1rem;
  }

  &__text {
    font-weight: 600;
    color: var(--text-2);
    margin: 0;
  }

  &__hint {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0;
  }
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;

  &:hover {
    background: color-mix(in oklab, var(--success) 5%, var(--surface-2));
    border-color: color-mix(in oklab, var(--success) 30%, var(--border-1));
    transform: translateX(4px);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  &:active {
    transform: translateX(2px) scale(0.99);
  }

  &--done {
    opacity: 0.7;

    .task-item__title {
      text-decoration: line-through;
      color: var(--text-muted);
    }
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;
  }

  &__priority {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  &__title {
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__due {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;

    &--overdue {
      color: var(--danger);
      font-weight: 600;
    }
  }
}

// Priority colors
.priority {
  &--critical {
    background: color-mix(in oklab, var(--danger) 20%, transparent);
    color: var(--danger);
    border: 1px solid color-mix(in oklab, var(--danger) 40%, transparent);
  }

  &--high {
    background: color-mix(in oklab, #f97316 20%, transparent);
    color: #f97316;
    border: 1px solid color-mix(in oklab, #f97316 40%, transparent);
  }

  &--medium {
    background: color-mix(in oklab, var(--warning) 20%, transparent);
    color: var(--warning);
    border: 1px solid color-mix(in oklab, var(--warning) 40%, transparent);
  }

  &--low {
    background: color-mix(in oklab, var(--success) 20%, transparent);
    color: var(--success);
    border: 1px solid color-mix(in oklab, var(--success) 40%, transparent);
  }

  &--lowest {
    background: color-mix(in oklab, var(--text-muted) 20%, transparent);
    color: var(--text-muted);
    border: 1px solid color-mix(in oklab, var(--text-muted) 40%, transparent);
  }
}

@media (max-width: 640px) {
  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;

    &__right {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
