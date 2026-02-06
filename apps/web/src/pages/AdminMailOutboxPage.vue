<script setup lang="ts">
import { useAdminMailOutboxPage } from "../assets/scripts/pages/useAdminMailOutboxPage";
const {
  st,
  busy,
  items,
  nextCursor,
  selected,
  selectedOpen,
  load,
  more,
  openRow,
  close,
  DateMapper,
} = useAdminMailOutboxPage();
</script>

<template>
  <section class="page" aria-label="Mock Mail Outbox">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Mock Mail Outbox</h1>
        <p class="opacity-70">
          Messages written by the mock gateway (use to copy reset URLs).
        </p>
      </div>

      <div class="flex gap-2 items-center">
        <input
          class="table-search-input"
          v-model="st.q"
          name="q"
          aria-label="Search mail outbox"
          placeholder="search by email/subject"
          @keyup.enter="load(true)"
        />

        <select
          class="table-search-input"
          v-model="st.kind"
          name="kind"
          aria-label="Filter by kind"
          @change="load(true)"
        >
          <option value="">all</option>
          <option value="password_invite">password_invite</option>
          <option value="generic">generic</option>
        </select>

        <button
          class="btn btn-primary"
          type="button"
          aria-label="Reload"
          :disabled="busy"
          :aria-disabled="busy"
          @click="load(true)"
        >
          Reload
        </button>
      </div>
    </header>

    <div
      class="card p-2 mt-3 overflow-auto"
      role="region"
      aria-label="Outbox table"
    >
      <table class="min-w-[980px] w-full" role="table" aria-label="Mail outbox">
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">At</th>
            <th class="py-2 pr-3">To</th>
            <th class="py-2 pr-3">Kind</th>
            <th class="py-2 pr-3">Subject</th>
            <th class="py-2 pr-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="m in items"
            :key="String(m._id)"
            class="border-t border-white/10"
          >
            <td class="py-2 pr-3">{{ DateMapper.fmtIso(m.createdAt) }}</td>
            <td class="py-2 pr-3 font-semibold">{{ m.to }}</td>
            <td class="py-2 pr-3">{{ m.kind }}</td>
            <td class="py-2 pr-3">{{ m.subject }}</td>
            <td class="py-2 pr-3">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Open message"
                @click="openRow(m)"
              >
                Open
              </button>
            </td>
          </tr>

          <tr v-if="!items.length && !busy">
            <td colspan="5" class="py-6 opacity-70 text-center">
              No messages.
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
        :disabled="!nextCursor || busy"
        :aria-disabled="!nextCursor || busy"
        @click="more"
      >
        Load more
      </button>
    </div>

    <teleport to="body">
      <div
        v-if="selectedOpen"
        class="mx-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Message details"
        @click.self="close"
      >
        <section class="mx-panel card" @click.stop>
          <header class="mx-head">
            <div class="grid gap-1">
              <h2 class="text-lg font-black">Message</h2>
              <p class="opacity-70">
                {{ selected?.to }} · {{ selected?.subject }}
              </p>
            </div>
            <button
              class="btn btn-ghost"
              type="button"
              aria-label="Close"
              @click="close"
            >
              Close
            </button>
          </header>

          <div class="p-3 grid gap-3">
            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Text</div>
              <pre class="card p-2 overflow-auto">{{
                selected?.text || "-"
              }}</pre>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Meta</div>
              <pre class="card p-2 overflow-auto">{{
                selected?.meta ? JSON.stringify(selected.meta, null, 2) : "-"
              }}</pre>
            </div>
          </div>
        </section>
      </div>
    </teleport>
  </section>
</template>

<style lang="scss">
@keyframes mxIn {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.mx-head {
  align-items: start;
  border-bottom: 1px solid rgba(120, 120, 140, 0.22);
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.85rem;
}

.mx-overlay {
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  inset: 0;
  place-items: center;
  position: fixed;
  z-index: 85;
}

.mx-panel {
  animation: mxIn 160ms ease both;
  width: min(900px, 95vw);

  &:hover {
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  }
  &:active {
    transform: translateY(1px);
  }
}

@starting-style {
  .mx-panel {
    opacity: 0;
    transform: translateY(10px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
