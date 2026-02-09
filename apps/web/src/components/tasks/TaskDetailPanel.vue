<script setup lang="ts">
import { useTaskDetailPanel } from "../../assets/scripts/tasks/useTaskDetailPanel";

const {
  activeTask,
  isOpen,
  subtasks,
  completedCount,
  totalCount,
  progressPercent,
  saving,
  newSubtaskText,
  close,
  toggleSubtask,
  addSubtask,
  removeSubtask,
  statusLabel,
  priorityLabel,
} = useTaskDetailPanel();
</script>

<template>
  <Transition name="panel-slide">
    <aside
      v-if="isOpen && activeTask"
      class="task-detail-panel"
      role="complementary"
      :aria-label="`Detalhes: ${activeTask.title}`"
    >
      <!-- Header -->
      <header class="tdp-header">
        <div class="tdp-header__left">
          <h2 class="tdp-title">{{ activeTask.title }}</h2>
          <div class="tdp-meta">
            <span class="tdp-badge" :data-status="activeTask.status">
              {{ statusLabel(activeTask.status) }}
            </span>
            <span class="tdp-badge tdp-badge--priority">
              {{ priorityLabel(activeTask.priority) }}
            </span>
          </div>
        </div>
        <button
          class="tdp-close btn btn-ghost"
          type="button"
          aria-label="Fechar painel de detalhes"
          @click="close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="18"
            height="18"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <!-- Info section -->
      <div class="tdp-info">
        <div v-if="activeTask.assigneeEmail" class="tdp-info__row">
          <span class="tdp-info__label">Responsável</span>
          <span class="tdp-info__value">{{ activeTask.assigneeEmail }}</span>
        </div>
        <div v-if="activeTask.dueAt" class="tdp-info__row">
          <span class="tdp-info__label">Entrega</span>
          <span class="tdp-info__value">{{
            activeTask.dueAt.slice(0, 10)
          }}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="tdp-progress" v-if="totalCount > 0">
        <div class="tdp-progress__header">
          <span class="tdp-progress__label">Progresso</span>
          <span class="tdp-progress__count">
            {{ completedCount }}/{{ totalCount }}
          </span>
        </div>
        <div
          class="tdp-progress__bar"
          role="progressbar"
          :aria-valuenow="progressPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${progressPercent}% completo`"
        >
          <div
            class="tdp-progress__fill"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Subtask checklist -->
      <div class="tdp-checklist">
        <h3 class="tdp-checklist__title">Lista de atividades</h3>

        <ul class="tdp-subtask-list" role="list" aria-label="Subtarefas">
          <li
            v-for="sub in subtasks"
            :key="sub.id"
            class="tdp-subtask"
            :class="{ 'is-done': sub.done }"
          >
            <label class="tdp-subtask__check">
              <input
                type="checkbox"
                :checked="sub.done"
                :disabled="saving"
                :aria-label="`Marcar '${sub.text}' como ${sub.done ? 'pendente' : 'concluída'}`"
                @change="toggleSubtask(sub.id)"
              />
              <span class="tdp-subtask__checkbox" aria-hidden="true">
                <svg
                  v-if="sub.done"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="14"
                  height="14"
                >
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </span>
            </label>

            <span class="tdp-subtask__text">{{ sub.text }}</span>

            <button
              class="tdp-subtask__del"
              type="button"
              :disabled="saving"
              :aria-label="`Remover subtarefa: ${sub.text}`"
              @click="removeSubtask(sub.id)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="14"
                height="14"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </li>
        </ul>

        <!-- Add subtask -->
        <form
          class="tdp-add-subtask"
          @submit.prevent="addSubtask"
          aria-label="Adicionar subtarefa"
        >
          <input
            v-model="newSubtaskText"
            class="tdp-add-subtask__input"
            type="text"
            placeholder="Adicionar item..."
            autocomplete="off"
            :disabled="saving"
            aria-label="Texto da nova subtarefa"
          />
          <button
            class="tdp-add-subtask__btn btn btn-ghost"
            type="submit"
            :disabled="!newSubtaskText.trim() || saving"
            aria-label="Adicionar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="16"
              height="16"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.task-detail-panel {
  width: 380px;
  min-width: 320px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-2);

  @media (max-width: 960px) {
    width: 100%;
    max-height: 50vh;
  }
}

/* ── Header ──────────────────────────────────────── */

.tdp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.tdp-header__left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.tdp-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-1);
  word-break: break-word;
}

.tdp-meta {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.tdp-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full, 9999px);
  background: var(--surface-2);
  color: var(--text-2);

  &[data-status="done"] {
    background: color-mix(in oklab, var(--success, #22c55e) 15%, transparent);
    color: var(--success, #22c55e);
  }
  &[data-status="doing"] {
    background: color-mix(in oklab, var(--primary) 15%, transparent);
    color: var(--primary);
  }
  &[data-status="blocked"] {
    background: color-mix(in oklab, var(--danger, #ef4444) 15%, transparent);
    color: var(--danger, #ef4444);
  }
  &[data-status="todo"] {
    background: var(--surface-2);
    color: var(--text-muted);
  }
}

.tdp-close {
  flex-shrink: 0;
  padding: 0.375rem;
}

/* ── Info ─────────────────────────────────────────── */

.tdp-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tdp-info__row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.tdp-info__label {
  color: var(--text-3);
  font-weight: 500;
}

.tdp-info__value {
  color: var(--text-1);
}

/* ── Progress ────────────────────────────────────── */

.tdp-progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tdp-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tdp-progress__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tdp-progress__count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-2);
}

.tdp-progress__bar {
  height: 6px;
  background: var(--surface-2);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.tdp-progress__fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-full, 9999px);
  transition: width 300ms ease;
}

/* ── Checklist ───────────────────────────────────── */

.tdp-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tdp-checklist__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-2);
}

.tdp-subtask-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.tdp-subtask {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm, 8px);
  transition: background-color 120ms ease;

  &:hover {
    background: var(--surface-2);

    .tdp-subtask__del {
      opacity: 1;
    }
  }

  &.is-done .tdp-subtask__text {
    text-decoration: line-through;
    opacity: 0.5;
  }
}

.tdp-subtask__check {
  display: flex;
  align-items: center;
  cursor: pointer;

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.tdp-subtask__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid var(--border-1);
  border-radius: 4px;
  background: transparent;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
  flex-shrink: 0;

  .is-done & {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

.tdp-subtask__text {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--text-1);
  line-height: 1.3;
  word-break: break-word;
}

.tdp-subtask__del {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 150ms ease,
    color 150ms ease;

  &:hover {
    color: var(--danger, #ef4444);
  }
}

/* ── Add subtask form ────────────────────────────── */

.tdp-add-subtask {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.tdp-add-subtask__input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 8px);
  color: var(--text-1);
  outline: none;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;

  &:focus {
    border-color: var(--primary);
    background: var(--surface-1);
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.tdp-add-subtask__btn {
  flex-shrink: 0;
  padding: 0.375rem;
}

/* ── Panel slide animation ───────────────────────── */

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
