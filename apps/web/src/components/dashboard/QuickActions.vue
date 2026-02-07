<script setup lang="ts">
const emit = defineEmits<{
  (e: "action", action: string): void;
}>();

const quickActions = [
  {
    id: "new-project",
    label: "New Project",
    icon: "folder-plus",
    color: "action--primary",
    description: "Create a new project",
  },
  {
    id: "new-task",
    label: "New Task",
    icon: "plus-circle",
    color: "action--success",
    description: "Add a task to a project",
  },
  {
    id: "invite-user",
    label: "Invite User",
    icon: "user-plus",
    color: "action--info",
    description: "Invite a team member",
  },
  {
    id: "view-reports",
    label: "View Reports",
    icon: "bar-chart",
    color: "action--warning",
    description: "Analytics & reports",
  },
];
</script>

<template>
  <section class="quick-actions card" aria-label="Quick actions">
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
          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
        </svg>
        Quick Actions
      </h3>
    </header>

    <div class="actions-grid" role="list">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="action-btn"
        :class="action.color"
        type="button"
        role="listitem"
        :title="action.description"
        :aria-label="action.description"
        @click="emit('action', action.id)"
      >
        <span class="action-btn__icon">
          <!-- Folder Plus -->
          <svg
            v-if="action.icon === 'folder-plus'"
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
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <!-- Plus Circle -->
          <svg
            v-else-if="action.icon === 'plus-circle'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <!-- User Plus -->
          <svg
            v-else-if="action.icon === 'user-plus'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <!-- Bar Chart -->
          <svg
            v-else
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
        </span>
        <span class="action-btn__label">{{ action.label }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.quick-actions {
  min-height: 150px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--warning);
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
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
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-md, 12px);

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-1);
    text-align: center;
  }
}

// Action colors
.action {
  &--primary {
    &:hover {
      background: color-mix(in oklab, var(--primary) 8%, var(--surface-2));
      border-color: color-mix(in oklab, var(--primary) 30%, var(--border-1));
    }

    .action-btn__icon {
      background: color-mix(in oklab, var(--primary) 15%, transparent);
      color: var(--primary);
    }
  }

  &--success {
    &:hover {
      background: color-mix(in oklab, var(--success) 8%, var(--surface-2));
      border-color: color-mix(in oklab, var(--success) 30%, var(--border-1));
    }

    .action-btn__icon {
      background: color-mix(in oklab, var(--success) 15%, transparent);
      color: var(--success);
    }
  }

  &--info {
    &:hover {
      background: color-mix(in oklab, var(--info) 8%, var(--surface-2));
      border-color: color-mix(in oklab, var(--info) 30%, var(--border-1));
    }

    .action-btn__icon {
      background: color-mix(in oklab, var(--info) 15%, transparent);
      color: var(--info);
    }
  }

  &--warning {
    &:hover {
      background: color-mix(in oklab, var(--warning) 8%, var(--surface-2));
      border-color: color-mix(in oklab, var(--warning) 30%, var(--border-1));
    }

    .action-btn__icon {
      background: color-mix(in oklab, var(--warning) 15%, transparent);
      color: var(--warning);
    }
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
