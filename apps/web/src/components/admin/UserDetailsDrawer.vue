<script setup lang="ts">
import { useUserDetailsDrawer } from "../../assets/scripts/admin/useUserDetailsDrawer";

const props = defineProps<{
  open: boolean;
  user: import("../../types/admin.types").AdminUserRow | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "changed"): void;
}>();

const {
  busy,
  auditRows,
  title,
  canAct,
  close,
  changeRole,
  forceReset,
  DateMapper,
} = useUserDetailsDrawer(props, emit);
</script>

<template>
  <transition name="drawer-fade">
    <div
      v-if="open"
      class="drawer-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="close"
    >
      <aside class="drawer-panel" aria-label="User details">
        <header class="drawer-head">
          <div class="grid gap-1">
            <h2 class="drawer-title">{{ title }}</h2>
            <p class="drawer-sub opacity-70">
              Role: <strong>{{ user?.roleKey || "-" }}</strong> · Token v:
              <strong>{{ user?.tokenVersion ?? "-" }}</strong>
            </p>
          </div>

          <button
            class="btn btn-ghost"
            type="button"
            aria-label="Close drawer"
            @click="close"
          >
            Close
          </button>
        </header>

        <section class="drawer-actions" aria-label="User actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="!canAct"
            :aria-disabled="!canAct"
            @click="changeRole"
          >
            Change role
          </button>

          <button
            class="btn btn-primary"
            type="button"
            :disabled="!canAct"
            :aria-disabled="!canAct"
            @click="forceReset"
          >
            Force reset
          </button>
        </section>

        <section class="drawer-body" aria-label="Recent audit">
          <h3 class="font-black">Recent audit</h3>

          <div
            class="card p-2 overflow-auto"
            role="region"
            aria-label="Audit events for user"
          >
            <table
              class="min-w-[820px] w-full"
              role="table"
              aria-label="Audit list"
            >
              <thead>
                <tr class="text-left opacity-80">
                  <th class="py-2 pr-3">At</th>
                  <th class="py-2 pr-3">Kind</th>
                  <th class="py-2 pr-3">Actor</th>
                  <th class="py-2 pr-3">Meta</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="e in auditRows"
                  :key="String(e._id)"
                  class="border-t border-white/10"
                >
                  <td class="py-2 pr-3">
                    {{ DateMapper.fmtIso(e.createdAt) }}
                  </td>
                  <td class="py-2 pr-3 font-semibold">{{ e.kind }}</td>
                  <td class="py-2 pr-3">
                    {{ e.actorEmailMasked || e.actorEmail || "-" }}
                  </td>
                  <td class="py-2 pr-3">
                    <code class="opacity-80" style="word-break: break-word">{{
                      e.meta ? JSON.stringify(e.meta) : "-"
                    }}</code>
                  </td>
                </tr>

                <tr v-if="!auditRows.length && !busy">
                  <td colspan="4" class="py-6 opacity-70 text-center">
                    No events.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>
  </transition>
</template>

<style lang="scss">
@keyframes drawerIn {
  0% {
    opacity: 0;
    transform: translateX(10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.drawer-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.drawer-body {
  display: grid;
  gap: 0.75rem;
}

.drawer-head {
  align-items: start;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
}

.drawer-overlay {
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  inset: 0;
  position: fixed;
  z-index: 60;
}

.drawer-panel {
  animation: drawerIn 170ms ease both;
  background: rgba(20, 20, 26, 0.92);
  border-left: 1px solid rgba(120, 120, 140, 0.25);
  box-shadow: -18px 0 55px rgba(0, 0, 0, 0.35);
  container-type: inline-size;
  height: 100%;
  margin-left: auto;
  max-width: 920px;
  padding: 1rem;
  width: min(920px, 92vw);
}

.drawer-sub {
  &::first-letter {
    text-transform: uppercase;
  }
  &::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.drawer-title {
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 160ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

@container (max-width: 560px) {
  .drawer-actions {
    flex-direction: column;
    justify-content: stretch;

    > .btn {
      width: 100%;
    }
  }
}

@starting-style {
  .drawer-panel {
    opacity: 0;
    transform: translateX(10px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
