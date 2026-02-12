<script setup lang="ts">
import { computed } from "vue";

interface Props {
  projects: number;
  tasks: number;
  activeProjects?: number;
  completedTasks?: number;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  activeProjects: 0,
  completedTasks: 0,
  loading: false,
});

const emit = defineEmits<{
  (e: "stat-click", stat: string): void;
}>();

const taskCompletionRate = computed(() => {
  if (!props.tasks) return 0;
  return Math.round((props.completedTasks / props.tasks) * 100);
});

const projectActivityRate = computed(() => {
  if (!props.projects) return 0;
  return Math.round((props.activeProjects / props.projects) * 100);
});
</script>

<template>
  <div class="summary-grid" role="list" aria-label="Estatísticas do painel">
    <!-- Projects Card -->
    <article
      class="stat-card stat-card--projects stat-card--clickable"
      role="listitem"
      tabindex="0"
      :aria-busy="loading"
      :title="`Total de projetos: ${projects} — Clique para ver todos`"
      @click="emit('stat-click', 'total-projects')"
      @keydown.enter="emit('stat-click', 'total-projects')"
    >
      <div class="stat-card__icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          />
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Total de Projetos</span>
        <span class="stat-card__value">{{ loading ? "—" : projects }}</span>
        <span v-if="activeProjects > 0" class="stat-card__sub">
          {{ activeProjects }} ativos ({{ projectActivityRate }}%)
        </span>
      </div>
    </article>

    <!-- Tasks Card -->
    <article
      class="stat-card stat-card--tasks stat-card--clickable"
      role="listitem"
      tabindex="0"
      :aria-busy="loading"
      :title="`Total de tarefas: ${tasks} — Clique para ver todas`"
      @click="emit('stat-click', 'total-tasks')"
      @keydown.enter="emit('stat-click', 'total-tasks')"
    >
      <div class="stat-card__icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"
          />
          <path
            d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"
          />
          <path
            d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"
          />
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Total de Tarefas</span>
        <span class="stat-card__value">{{ loading ? "—" : tasks }}</span>
        <span v-if="completedTasks > 0" class="stat-card__sub">
          {{ completedTasks }} concluídas ({{ taskCompletionRate }}%)
        </span>
      </div>
    </article>

    <!-- Active Projects Card -->
    <article
      class="stat-card stat-card--active stat-card--clickable"
      role="listitem"
      tabindex="0"
      :aria-busy="loading"
      :title="`Projetos ativos: ${activeProjects} — Clique para ver ativos`"
      @click="emit('stat-click', 'active-projects')"
      @keydown.enter="emit('stat-click', 'active-projects')"
    >
      <div class="stat-card__icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M2 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L7 13.101l-4.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v10.566l3.723-2.482a.5.5 0 0 1 .554 0L11 14.566V4a1 1 0 0 0-1-1z"
          />
          <path
            d="M4.268 1H12a1 1 0 0 1 1 1v11.768l.223.148A.5.5 0 0 0 14 13.5V2a2 2 0 0 0-2-2H6a2 2 0 0 0-1.732 1"
          />
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Projetos Ativos</span>
        <span class="stat-card__value">{{
          loading ? "—" : activeProjects
        }}</span>
        <span
          class="stat-card__sub stat-card__sub--positive"
          v-if="!loading && activeProjects > 0"
        >
          Em andamento
        </span>
      </div>
    </article>

    <!-- Completion Rate Card -->
    <article
      class="stat-card stat-card--rate stat-card--clickable"
      role="listitem"
      tabindex="0"
      :aria-busy="loading"
      :title="`Taxa de conclusão: ${taskCompletionRate}% — Clique para relatórios`"
      @click="emit('stat-click', 'completion-rate')"
      @keydown.enter="emit('stat-click', 'completion-rate')"
    >
      <div class="stat-card__icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Taxa de Conclusão</span>
        <span class="stat-card__value">{{
          loading ? "—" : taskCompletionRate + "%"
        }}</span>
        <div v-if="!loading" class="stat-card__progress">
          <div
            class="stat-card__progress-bar"
            :style="{ width: taskCompletionRate + '%' }"
          ></div>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    border-color 150ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
    border-color: var(--border-2);
  }

  &--clickable {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }

    &:active {
      transform: translateY(0) scale(0.98);
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: var(--radius-md, 12px);
    flex-shrink: 0;

    svg {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  &--projects &__icon {
    background: color-mix(in oklab, var(--primary) 15%, transparent);
    color: var(--primary);
  }

  &--tasks &__icon {
    background: color-mix(in oklab, var(--success) 15%, transparent);
    color: var(--success);
  }

  &--active &__icon {
    background: color-mix(in oklab, var(--warning) 15%, transparent);
    color: var(--warning);
  }

  &--rate &__icon {
    background: color-mix(in oklab, var(--info) 15%, transparent);
    color: var(--info);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__value {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-1);
    line-height: 1.1;
  }

  &__sub {
    font-size: 0.75rem;
    color: var(--text-muted);

    &--positive {
      color: var(--success);
    }
  }

  &__progress {
    height: 4px;
    margin-top: 0.5rem;
    background: var(--surface-3);
    border-radius: 2px;
    overflow: hidden;
  }

  &__progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--success));
    border-radius: 2px;
    transition: width 500ms ease;
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
