<script setup lang="ts">
import { useDashboardProjectsPage } from "../assets/scripts/pages/useDashboardProjectsPage";
const { rows, loading, error, nextCursor, q, load, more } =
  useDashboardProjectsPage();
</script>

<template>
  <section class="dp-page" aria-label="Projects">
    <header class="dp-actions">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Projects</h1>
        <p class="opacity-70">
          Data comes from Pinia; if the backend endpoint is missing, dev
          fallback mocks are used.
        </p>
      </div>

      <div class="flex gap-2 items-center">
        <input
          class="table-search-input"
          v-model="q"
          name="q"
          aria-label="Search projects"
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
      class="dp-card card p-2 mt-3 overflow-auto"
      role="region"
      aria-label="Projects table"
    >
      <table class="min-w-[980px] w-full" role="table" aria-label="Projects">
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Code</th>
            <th class="py-2 pr-3">Name</th>
            <th class="py-2 pr-3">Owner</th>
            <th class="py-2 pr-3">Status</th>
            <th class="py-2 pr-3">Due</th>
            <th class="py-2 pr-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="p in rows"
            :key="p?.id || (Math.random() * Math.random()).toString(36)"
            class="border-t border-white/10"
          >
            <td class="py-2 pr-3 font-semibold">{{ p?.code ?? "-" }}</td>
            <td class="py-2 pr-3">{{ p?.name ?? "-" }}</td>
            <td class="py-2 pr-3">{{ p?.ownerEmail ?? "-" }}</td>
            <td class="py-2 pr-3">{{ p?.status ?? "-" }}</td>
            <td class="py-2 pr-3">{{ p?.dueAt ?? "-" }}</td>
            <td class="py-2 pr-3">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Edit project"
              >
                Edit
              </button>
            </td>
          </tr>

          <tr v-if="!rows.length && !loading">
            <td colspan="6" class="py-6 opacity-70 text-center">
              {{ error || "No projects." }}
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
@keyframes dpIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.dp-actions {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.dp-card {
  animation: dpIn 160ms ease both;

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

.dp-page {
  padding: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .dp-card {
    animation: none;
  }
}

@starting-style {
  .dp-card {
    opacity: 0;
    transform: translateY(8px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
