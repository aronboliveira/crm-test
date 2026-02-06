<script setup lang="ts">
import { useAdminUserDetailsDrawer } from "../../assets/scripts/admin/useAdminUserDetailsDrawer";

const props = defineProps<{
  open: boolean;
  userId: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated"): void;
}>();

const {
  busy,
  user,
  audit,
  close,
  setRole,
  forceReset,
  lockUser,
  unlockUser,
  reissueInvite,
} = useAdminUserDetailsDrawer(props, emit);
</script>

<template>
  <teleport to="body">
    <div
      v-if="open"
      class="admin-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="User details drawer"
      @click.self="close"
    >
      <aside class="admin-drawer__panel card" @click.stop>
        <header class="admin-drawer__head">
          <div class="grid gap-1">
            <h2 class="text-lg font-black">User details</h2>
            <p class="opacity-70" v-if="user">{{ user.email }}</p>
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

        <div v-if="busy" class="p-3 opacity-70" aria-live="polite">
          Loading...
        </div>

        <div v-else class="admin-drawer__body">
          <section v-if="user" class="grid gap-2" aria-label="User info">
            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Role</div>
              <div class="font-semibold">{{ user.roleKey }}</div>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Token version</div>
              <div class="font-semibold">{{ user.tokenVersion }}</div>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Password updated</div>
              <div class="font-semibold">
                {{ user.passwordUpdatedAt || "-" }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2">
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Change role"
                @click="setRole(user)"
              >
                Change role
              </button>

              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Force reset"
                @click="forceReset(user)"
              >
                Force reset
              </button>
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Re-issue invite"
                @click="reissueInvite(user)"
              >
                Re-issue invite
              </button>
            </div>

            <div class="grid gap-1" v-if="user">
              <div class="opacity-70 text-sm">Status</div>
              <div class="font-semibold">
                {{ user.lockedAt ? "Locked" : "Active" }}
                <span class="opacity-70" v-if="user.lockedAt"
                  >· {{ user.lockedAt }}</span
                >
              </div>
              <div class="opacity-70 text-sm" v-if="user.lockedReason">
                {{ user.lockedReason }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2" v-if="user">
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Change role"
                @click="setRole(user)"
              >
                Change role
              </button>
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Force reset"
                @click="forceReset(user)"
              >
                Force reset
              </button>

              <button
                v-if="!user.lockedAt"
                class="btn btn-primary"
                type="button"
                aria-label="Lock account"
                @click="lockUser(user)"
              >
                Lock
              </button>

              <button
                v-else
                class="btn btn-primary"
                type="button"
                aria-label="Unlock account"
                @click="unlockUser(user)"
              >
                Unlock
              </button>
            </div>
          </section>

          <section class="grid gap-2 pt-3" aria-label="Recent audit events">
            <h3 class="font-black">Recent audit</h3>

            <div
              class="card p-2 overflow-auto"
              role="region"
              aria-label="Audit list"
            >
              <table
                class="min-w-[860px] w-full"
                role="table"
                aria-label="User audit events"
              >
                <thead>
                  <tr class="text-left opacity-80">
                    <th class="py-2 pr-3">At</th>
                    <th class="py-2 pr-3">Kind</th>
                    <th class="py-2 pr-3">Actor</th>
                    <th class="py-2 pr-3">Target</th>
                    <th class="py-2 pr-3">Meta</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="e in audit"
                    :key="e.id"
                    class="border-t border-white/10"
                  >
                    <td class="py-2 pr-3">{{ e.createdAt }}</td>
                    <td class="py-2 pr-3 font-semibold">{{ e.kind }}</td>
                    <td class="py-2 pr-3">{{ e.actorEmailMasked || "-" }}</td>
                    <td class="py-2 pr-3">{{ e.targetEmailMasked || "-" }}</td>
                    <td class="py-2 pr-3">
                      <code class="opacity-80" style="word-break: break-word">{{
                        e.meta ? JSON.stringify(e.meta) : "-"
                      }}</code>
                    </td>
                  </tr>

                  <tr v-if="!audit.length">
                    <td colspan="5" class="py-6 opacity-70 text-center">
                      No audit events.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </teleport>
</template>

<style lang="scss">
@keyframes drawerBackdropIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes drawerPanelIn {
  0% {
    opacity: 0;
    transform: translateX(12px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.admin-drawer {
  align-items: stretch;
  animation: drawerBackdropIn 140ms ease both;
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  inset: 0;
  position: fixed;
  z-index: 60;
}

.admin-drawer__body {
  display: grid;
  gap: 1rem;
  padding: 0.75rem;
}

.admin-drawer__head {
  align-items: start;
  border-bottom: 1px solid rgba(120, 120, 140, 0.22);
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.85rem;
}

.admin-drawer__panel {
  animation: drawerPanelIn 180ms ease both;
  border-radius: 1rem 0 0 1rem;
  height: 100%;
  justify-self: end;
  max-width: 860px;
  overflow: auto;
  width: min(860px, 94vw);

  &:active {
    transform: translateY(1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-drawer,
  .admin-drawer__panel {
    animation: none;
  }
}

@starting-style {
  .admin-drawer {
    opacity: 0;
  }
  .admin-drawer__panel {
    opacity: 0;
    transform: translateX(12px);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
