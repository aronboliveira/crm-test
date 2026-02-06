<script setup lang="ts">
import { useDashboardTasksPage } from "../assets/scripts/pages/useDashboardTasksPage";
const { rows, q, loading, error, nextCursor, load, more } =
  useDashboardTasksPage();
</script>

<template>
  <section class="dt-page" aria-label="Tasks">
    <header class="dt-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Tasks</h1>
        <p class="opacity-70">
          Same pattern as projects; edit is a stub for now.
        </p>
      </div>

      <div class="flex gap-2 items-center">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Search tasks"
          placeholder="search"
          @keyup.enter="load(true)"
        />
        <button
          class="btn btn-primary"
          type="button"
          :disabled="loading"
          :aria-disabled="loading"
          @click="load(true)"
        >
          Reload
        </button>
      </div>
    </header>

    <div
      class="dt-card card p-2 mt-3 overflow-auto"
      role="region"
      aria-label="Tasks table"
    >
      <table class="min-w-[1100px] w-full" role="table" aria-label="Tasks">
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Title</th>
            <th class="py-2 pr-3">Project</th>
            <th class="py-2 pr-3">Assignee</th>
            <th class="py-2 pr-3">Status</th>
            <th class="py-2 pr-3">Priority</th>
            <th class="py-2 pr-3">Due</th>
            <th class="py-2 pr-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="t in rows"
            :key="t?.id || (Math.random() * Math.random()).toString(36)"
            class="border-t border-white/10"
          >
            <td class="py-2 pr-3 font-semibold">{{ t?.title ?? "-" }}</td>
            <td class="py-2 pr-3">{{ t?.projectId ?? "-" }}</td>
            <td class="py-2 pr-3">{{ t?.assigneeEmail ?? "-" }}</td>
            <td class="py-2 pr-3">{{ t?.status ?? "-" }}</td>
            <td class="py-2 pr-3">{{ t?.priority ?? "-" }}</td>
            <td class="py-2 pr-3">{{ t?.dueAt ?? "-" }}</td>
            <td class="py-2 pr-3">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Edit task"
              >
                Edit
              </button>
            </td>
          </tr>

          <tr v-if="!rows.length && !loading">
            <td colspan="7" class="py-6 opacity-70 text-center">
              {{ error || "No tasks." }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 flex justify-end">
      <button
        class="btn btn-ghost"
        type="button"
        aria-label="Load more"
        :disabled="!nextCursor || loading"
        :aria-disabled="!nextCursor || loading"
        @click="more"
      >
        Load more
      </button>
    </div>
  </section>
</template>

<style lang="scss">
@keyframes dtIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.dt-actions {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.dt-card {
  animation: dtIn 160ms ease both;

  &:hover {
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  }
  &:active {
    transform: translateY(1px);
  }

  ::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.dt-page {
  padding: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .dt-card {
    animation: none;
  }
}

@starting-style {
  .dt-card {
    opacity: 0;
    transform: translateY(8px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
