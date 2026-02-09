<script setup lang="ts">
import { useSidebarNav } from "../../assets/scripts/shell/useSidebarNav";
const {
  collapsed,
  sections,
  iconFor,
  toggle,
  isActive,
  route,
  tasksExpanded,
  taskItems,
  toggleTasksExpanded,
  goToTask,
  isTaskActive,
  taskStatusIcon,
} = useSidebarNav();
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'is-collapsed': collapsed }"
    role="navigation"
    aria-label="Main navigation"
  >
    <!-- Sidebar Header -->
    <div class="sidebar-head">
      <button
        class="sidebar-toggle"
        type="button"
        :aria-expanded="!collapsed"
        aria-controls="sidebar-links"
        @click="toggle"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="sidebar-toggle__icon"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>
      <span class="sidebar-brand" :class="{ 'sr-only': collapsed }">
        Project CRM
      </span>
    </div>

    <!-- Navigation Sections -->
    <nav id="sidebar-links" class="sidebar-nav">
      <div
        v-for="section in sections"
        :key="section.title"
        class="sidebar-section"
      >
        <h2 class="sidebar-section__title" :class="{ 'sr-only': collapsed }">
          {{ section.title }}
        </h2>

        <ul class="sidebar-list">
          <li v-for="item in section.items" :key="item.key">
            <!-- Regular nav item (non-tasks) -->
            <template v-if="item.key !== 'tasks'">
              <a
                class="sidebar-link"
                :class="isActive(item.to)"
                :href="item.to"
                @click.prevent="$router.push(item.to)"
                :aria-current="route.path === item.to ? 'page' : undefined"
                :title="collapsed ? item.label : undefined"
              >
                <span class="sidebar-link__icon" aria-hidden="true">
                  <!-- Home -->
                  <svg
                    v-if="iconFor(item.key) === 'home'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                  <!-- Folder -->
                  <svg
                    v-else-if="iconFor(item.key) === 'folder'"
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
                  <!-- Users -->
                  <svg
                    v-else-if="iconFor(item.key) === 'users'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <!-- Activity -->
                  <svg
                    v-else-if="iconFor(item.key) === 'activity'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                  </svg>
                  <!-- Mail -->
                  <svg
                    v-else-if="iconFor(item.key) === 'mail'"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <!-- Default Circle -->
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
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </span>
                <span
                  class="sidebar-link__text"
                  :class="{ 'sr-only': collapsed }"
                >
                  {{ item.label }}
                </span>
              </a>
            </template>

            <!-- Tasks nav item with collapsible submenu (Notion-style) -->
            <template v-else>
              <div class="sidebar-tasks-group">
                <a
                  class="sidebar-link sidebar-link--expandable"
                  :class="isActive(item.to)"
                  :href="item.to"
                  @click.prevent="$router.push(item.to)"
                  :aria-current="route.path === item.to ? 'page' : undefined"
                  :title="collapsed ? item.label : undefined"
                >
                  <span class="sidebar-link__icon" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="9,11 12,14 22,4" />
                      <path
                        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                      />
                    </svg>
                  </span>
                  <span
                    class="sidebar-link__text"
                    :class="{ 'sr-only': collapsed }"
                  >
                    {{ item.label }}
                  </span>
                  <button
                    v-if="!collapsed"
                    class="sidebar-expand-btn"
                    type="button"
                    :aria-expanded="tasksExpanded"
                    :aria-label="
                      tasksExpanded ? 'Recolher tarefas' : 'Expandir tarefas'
                    "
                    :title="tasksExpanded ? 'Recolher' : 'Expandir'"
                    @click.prevent.stop="toggleTasksExpanded"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="sidebar-expand-icon"
                      :class="{ 'is-expanded': tasksExpanded }"
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                </a>

                <!-- Collapsible task sub-items -->
                <Transition name="subtasks">
                  <ul
                    v-if="tasksExpanded && !collapsed"
                    class="sidebar-subtasks"
                    role="list"
                    aria-label="Lista de tarefas"
                  >
                    <li
                      v-for="task in taskItems"
                      :key="task.id"
                      class="sidebar-subtask"
                    >
                      <a
                        class="sidebar-subtask__link"
                        :class="{ 'is-active': isTaskActive(task.id) }"
                        :href="`/dashboard/tasks?taskId=${task.id}`"
                        :title="task.title"
                        @click.prevent="goToTask(task.id)"
                      >
                        <span
                          class="sidebar-subtask__status"
                          :data-status="task.status"
                          aria-hidden="true"
                        >
                          {{ taskStatusIcon(task.status) }}
                        </span>
                        <span class="sidebar-subtask__text">
                          {{ task.title }}
                        </span>
                      </a>
                    </li>
                    <li
                      v-if="!taskItems.length"
                      class="sidebar-subtask sidebar-subtask--empty"
                    >
                      <span class="sidebar-subtask__text opacity-50"
                        >Nenhuma tarefa</span
                      >
                    </li>
                  </ul>
                </Transition>
              </div>
            </template>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width, 260px);
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--surface-1);
  border-right: 1px solid var(--border-1);
  transition: width 200ms ease;
  overflow: hidden;

  &.is-collapsed {
    width: var(--sidebar-collapsed, 64px);

    .sidebar-section__title {
      opacity: 0;
      height: 0;
      margin: 0;
      padding: 0;
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
}

.sidebar-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-1);
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 8px);
  color: var(--text-2);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;

  &:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}

.sidebar-brand {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0;
}

.sidebar-section {
  margin-bottom: 0.5rem;

  &__title {
    margin: 0;
    padding: 0.5rem 1rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition:
      opacity 200ms ease,
      height 200ms ease;
  }
}

.sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-2);
  text-decoration: none;
  border-radius: var(--radius-md, 12px);
  transition:
    background-color 150ms ease,
    color 150ms ease;

  &:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }

  &.is-active {
    background: var(--primary-soft);
    color: var(--primary);
    font-weight: 600;

    .sidebar-link__icon svg {
      stroke-width: 2.5;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  &__text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }
}

/* ── Expandable task link ────────────────────────────────── */

.sidebar-link--expandable {
  position: relative;
  padding-right: 2rem;
}

.sidebar-expand-btn {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 6px);
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 150ms ease,
    background-color 150ms ease,
    color 150ms ease;

  &:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }
}

.sidebar-tasks-group:hover .sidebar-expand-btn,
.sidebar-expand-btn:focus-visible {
  opacity: 1;
}

.sidebar-expand-icon {
  width: 0.875rem;
  height: 0.875rem;
  transition: transform 200ms ease;

  &.is-expanded {
    transform: rotate(90deg);
  }
}

/* ── Collapsible subtask list (Notion-style) ─────────────── */

.sidebar-subtasks {
  list-style: none;
  margin: 0;
  padding: 0.125rem 0 0.25rem 0;
  overflow: hidden;
}

.sidebar-subtask {
  margin: 0;
  padding: 0;
}

.sidebar-subtask__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0.5rem;
  padding: 0.375rem 0.75rem 0.375rem 2.25rem;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--text-3);
  text-decoration: none;
  border-radius: var(--radius-sm, 8px);
  transition:
    background-color 120ms ease,
    color 120ms ease;
  cursor: pointer;

  &:hover {
    background: var(--surface-2);
    color: var(--text-1);
  }

  &.is-active {
    background: color-mix(in oklab, var(--primary) 10%, transparent);
    color: var(--primary);
    font-weight: 500;
  }
}

.sidebar-subtask__status {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  line-height: 1;

  &[data-status="done"] {
    color: var(--success, #22c55e);
  }
  &[data-status="doing"] {
    color: var(--primary);
  }
  &[data-status="blocked"] {
    color: var(--danger, #ef4444);
  }
  &[data-status="todo"] {
    color: var(--text-muted);
  }
}

.sidebar-subtask__text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.sidebar-subtask--empty {
  padding: 0.375rem 0.75rem 0.375rem 2.25rem;
  font-size: 0.8125rem;
}

/* ── Subtask collapse animation ──────────────────────────── */

.subtasks-enter-active,
.subtasks-leave-active {
  transition:
    max-height 200ms ease,
    opacity 200ms ease;
  max-height: 600px;
  overflow: hidden;
}

.subtasks-enter-from,
.subtasks-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
