<script setup lang="ts">
import type {
  ProjectRow,
  ProjectStatus,
} from "../../pinia/types/projects.types";

interface Props {
  projects: ProjectRow[];
  loading?: boolean;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  max: 5,
});

const emit = defineEmits<{
  (e: "view-all"): void;
  (e: "view-project", project: ProjectRow): void;
}>();

const displayProjects = computed(() => props.projects.slice(0, props.max));

const statusColors: Record<ProjectStatus, string> = {
  planned: "badge--pending",
  active: "badge--active",
  blocked: "badge--blocked",
  done: "badge--done",
  archived: "badge--archived",
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Sem data de entrega";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Data inválida";
  }
};

const isOverdue = (dueAt: string | null): boolean => {
  if (!dueAt) return false;
  try {
    return new Date(dueAt) < new Date();
  } catch {
    return false;
  }
};

import { computed } from "vue";
</script>

<template>
  <section class="recent-projects card" aria-label="Projetos recentes">
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
          <path
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          />
        </svg>
        Projetos Recentes
      </h3>
      <button
        v-if="projects.length > max"
        class="btn btn-ghost btn-sm"
        type="button"
        title="Ver todos os projetos"
        @click="emit('view-all')"
      >
        Ver Todos ({{ projects.length }})
      </button>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="projects-loading"
      role="status"
      aria-label="Carregando projetos"
    >
      <div v-for="i in 3" :key="i" class="skeleton-row">
        <div class="skeleton skeleton-text" style="width: 60%"></div>
        <div class="skeleton skeleton-badge"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!displayProjects.length" class="projects-empty">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="projects-empty__icon"
      >
        <path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
      <p class="projects-empty__text">Nenhum projeto ainda</p>
      <p class="projects-empty__hint">
        Crie seu primeiro projeto para começar
      </p>
    </div>

    <!-- Projects List -->
    <ul v-else class="projects-list" role="list">
      <li
        v-for="project in displayProjects"
        :key="project.id"
        class="project-item"
        role="listitem"
        tabindex="0"
        :title="`${project.name} (${project.status}) - Clique para ver detalhes`"
        @click="emit('view-project', project)"
        @keydown.enter="emit('view-project', project)"
      >
        <div class="project-item__main">
          <span class="project-item__code">{{ project.code }}</span>
          <span class="project-item__name">{{ project.name }}</span>
        </div>
        <div class="project-item__meta">
          <span :class="['badge', statusColors[project.status]]">
            {{ project.status }}
          </span>
          <span
            class="project-item__due"
            :class="{
              'project-item__due--overdue':
                isOverdue(project.dueAt) && project.status !== 'done',
            }"
          >
            {{ formatDate(project.dueAt) }}
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.recent-projects {
  min-height: 200px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--primary);
  }
}

.projects-loading {
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
}

.skeleton-text {
  height: 1rem;
  border-radius: 4px;
}

.skeleton-badge {
  width: 60px;
  height: 1.25rem;
  border-radius: 999px;
}

.projects-empty {
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

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.project-item {
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
    background: color-mix(in oklab, var(--primary) 5%, var(--surface-2));
    border-color: color-mix(in oklab, var(--primary) 30%, var(--border-1));
    transform: translateX(4px);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  &:active {
    transform: translateX(2px) scale(0.99);
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  &__code {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary);
    background: color-mix(in oklab, var(--primary) 12%, transparent);
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__name {
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
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

@media (max-width: 640px) {
  .project-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;

    &__meta {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
