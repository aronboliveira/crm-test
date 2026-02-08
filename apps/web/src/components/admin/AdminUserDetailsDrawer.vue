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
            <h2 class="text-lg font-black">Detalhes do Usuário</h2>
            <p class="opacity-70" v-if="user">{{ user.email }}</p>
          </div>

          <button
            class="btn btn-ghost"
            type="button"
            aria-label="Fechar"
            @click="close"
          >
            Fechar
          </button>
        </header>

        <div v-if="busy" class="p-3 opacity-70" aria-live="polite">
          Carregando...
        </div>

        <div v-else class="admin-drawer__body">
          <section
            v-if="user"
            class="grid gap-2"
            aria-label="Informações do usuário"
          >
            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Perfil</div>
              <div class="font-semibold">{{ user.roleKey }}</div>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Versão do token</div>
              <div class="font-semibold">{{ user.tokenVersion }}</div>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Senha atualizada em</div>
              <div class="font-semibold">
                {{ user.passwordUpdatedAt || "—" }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-2">
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Alterar perfil"
                @click="setRole(user)"
              >
                Alterar perfil
              </button>

              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Forçar redefinição"
                @click="forceReset(user)"
              >
                Forçar redefinição
              </button>
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Reenviar convite"
                @click="reissueInvite(user)"
              >
                Reenviar convite
              </button>
            </div>

            <div class="grid gap-1" v-if="user">
              <div class="opacity-70 text-sm">Situação</div>
              <div class="font-semibold">
                {{ user.lockedAt ? "Bloqueado" : "Ativo" }}
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
                aria-label="Alterar perfil"
                @click="setRole(user)"
              >
                Alterar perfil
              </button>
              <button
                class="btn btn-ghost"
                type="button"
                aria-label="Forçar redefinição"
                @click="forceReset(user)"
              >
                Forçar redefinição
              </button>

              <button
                v-if="!user.lockedAt"
                class="btn btn-primary"
                type="button"
                aria-label="Bloquear conta"
                @click="lockUser(user)"
              >
                Bloquear
              </button>

              <button
                v-else
                class="btn btn-primary"
                type="button"
                aria-label="Desbloquear conta"
                @click="unlockUser(user)"
              >
                Desbloquear
              </button>
            </div>
          </section>

          <section
            class="grid gap-2 pt-3"
            aria-label="Eventos de auditoria recentes"
          >
            <h3 class="font-black">Auditoria recente</h3>

            <div
              class="card p-2 overflow-auto"
              role="region"
              aria-label="Lista de auditoria"
            >
              <table
                class="min-w-[860px] w-full"
                role="table"
                aria-label="Eventos de auditoria do usuário"
              >
                <thead>
                  <tr class="text-left opacity-80">
                    <th class="py-2 pr-3">Data</th>
                    <th class="py-2 pr-3">Tipo</th>
                    <th class="py-2 pr-3">Ator</th>
                    <th class="py-2 pr-3">Alvo</th>
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
                      Nenhum evento de auditoria.
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
