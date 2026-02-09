<script setup lang="ts">
import { useKanbanBoard } from "../../assets/scripts/tasks/useKanbanBoard";

const {
  columns,
  dragging,
  dragOverCol,
  updating,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  openTask,
  priorityTag,
  subtaskProgress,
} = useKanbanBoard();
</script>

<template>
  <div class="kanban" role="region" aria-label="Quadro Kanban">
    <div class="kanban__board">
      <section
        v-for="col in columns"
        :key="col.id"
        class="kanban__col"
        :class="{ 'is-drag-over': dragOverCol === col.id }"
        role="group"
        :aria-label="col.label"
        @dragover.prevent="onDragOver($event, col.id)"
        @dragleave="onDragLeave($event, col.id)"
        @drop="onDrop($event, col.id)"
      >
        <!-- Column header -->
        <header class="kanban__col-header">
          <span class="kanban__col-dot" :style="{ background: col.color }" />
          <span class="kanban__col-title">{{ col.label }}</span>
          <span class="kanban__col-count">{{ col.items.length }}</span>
        </header>

        <!-- Cards -->
        <div class="kanban__cards">
          <article
            v-for="task in col.items"
            :key="task.id"
            class="kanban__card"
            :class="{
              'is-dragging': dragging === task.id,
              'is-updating': updating,
            }"
            draggable="true"
            tabindex="0"
            :aria-label="task.title"
            role="listitem"
            @dragstart="onDragStart($event, task.id)"
            @click="openTask(task.id)"
            @keydown.enter="openTask(task.id)"
          >
            <!-- Card top row: priority + subtask progress -->
            <div class="kanban__card-top">
              <span class="kanban__priority" :data-p="task.priority">
                {{ priorityTag(task.priority) }}
              </span>
              <span v-if="subtaskProgress(task)" class="kanban__subtask-badge">
                ☑ {{ subtaskProgress(task) }}
              </span>
            </div>

            <!-- Title -->
            <h4 class="kanban__card-title">{{ task.title }}</h4>

            <!-- Footer: assignee + due date -->
            <div class="kanban__card-footer">
              <span
                v-if="task.assigneeEmail"
                class="kanban__assignee"
                :title="task.assigneeEmail"
              >
                {{ task.assigneeEmail.split("@")[0] }}
              </span>
              <span v-if="task.dueAt" class="kanban__due">
                {{ task.dueAt.slice(5, 10) }}
              </span>
            </div>
          </article>

          <!-- Empty state -->
          <div v-if="!col.items.length" class="kanban__empty">
            Nenhuma tarefa
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.kanban {
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.kanban__board {
  display: flex;
  gap: 1rem;
  min-width: min-content;
}

/* ── Column ────────────────────────────────────── */

.kanban__col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 280px;
  min-width: 260px;
  flex-shrink: 0;
  padding: 0.75rem;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &.is-drag-over {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 25%, transparent);
  }
}

.kanban__col-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-1);
}

.kanban__col-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kanban__col-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-2);
  flex: 1;
}

.kanban__col-count {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-full, 9999px);
  background: var(--surface-2);
  color: var(--text-3);
}

/* ── Cards container ─────────────────────────────── */

.kanban__cards {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-height: 60px;
}

/* ── Card ────────────────────────────────────────── */

.kanban__card {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md, 12px);
  cursor: grab;
  user-select: none;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    opacity 120ms ease;

  &:hover {
    background: color-mix(in oklab, var(--surface-2) 90%, var(--primary) 10%);
    border-color: var(--border-1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }

  &.is-dragging {
    opacity: 0.4;
    cursor: grabbing;
  }

  &.is-updating {
    pointer-events: none;
    opacity: 0.7;
  }
}

.kanban__card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kanban__priority {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-1);
  color: var(--text-3);

  &[data-p="1"] {
    background: color-mix(in oklab, var(--danger, #ef4444) 20%, transparent);
    color: var(--danger, #ef4444);
  }
  &[data-p="2"] {
    background: color-mix(in oklab, #f59e0b 20%, transparent);
    color: #f59e0b;
  }
}

.kanban__subtask-badge {
  font-size: 0.6875rem;
  color: var(--text-3);
}

.kanban__card-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.35;
  word-break: break-word;
}

.kanban__card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6875rem;
  color: var(--text-3);
}

.kanban__assignee {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kanban__due {
  white-space: nowrap;
}

/* ── Empty state ─────────────────────────────────── */

.kanban__empty {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>
