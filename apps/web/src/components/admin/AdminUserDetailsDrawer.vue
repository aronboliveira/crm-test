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
  userProjects,
  userTasks,
  userActivity,
  userCompetencies,
  userWorkRole,
  close,
  setRole,
  forceReset,
  lockUser,
  unlockUser,
  reissueInvite,
} = useAdminUserDetailsDrawer(props, emit);

const statusLabel = (s: string) =>
  (
    ({
      planned: "Planejado",
      active: "Ativo",
      blocked: "Bloqueado",
      done: "Concluído",
      archived: "Arquivado",
      todo: "A Fazer",
      doing: "Em Progresso",
    }) as Record<string, string>
  )[s] || s;

const statusBadge = (s: string) =>
  (
    ({
      planned: "drawer-badge--warn",
      active: "drawer-badge--success",
      blocked: "drawer-badge--danger",
      done: "drawer-badge--info",
      archived: "drawer-badge--muted",
      todo: "drawer-badge--muted",
      doing: "drawer-badge--info",
    }) as Record<string, string>
  )[s] || "";

const priorityLabel = (p: number) =>
  (
    ({
      1: "Crítica",
      2: "Alta",
      3: "Média",
      4: "Baixa",
      5: "Mínima",
    }) as Record<number, string>
  )[p] || "—";

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};
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
            <div class="drawer-info-grid">
              <div class="grid gap-1">
                <div class="opacity-70 text-sm">Perfil</div>
                <div class="font-semibold">{{ user.roleKey }}</div>
              </div>

              <div class="grid gap-1">
                <div class="opacity-70 text-sm">Cargo</div>
                <div class="font-semibold">{{ userWorkRole || "—" }}</div>
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

            <!-- Competencies / Skills -->
            <div class="grid gap-1" v-if="userCompetencies.length">
              <div class="opacity-70 text-sm">Competências</div>
              <div class="drawer-tags">
                <span
                  v-for="c in userCompetencies"
                  :key="c"
                  class="drawer-tag"
                  >{{ c }}</span
                >
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
                class="btn btn-ghost"
                type="button"
                aria-label="Reenviar convite"
                @click="reissueInvite(user)"
              >
                Reenviar convite
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

          <!-- Projects Section -->
          <section class="grid gap-2 pt-3" aria-label="Projetos do usuário">
            <h3 class="font-black">Projetos Participantes</h3>
            <div
              class="card p-2 overflow-auto"
              role="region"
              aria-label="Lista de projetos do usuário"
            >
              <table
                v-if="userProjects.length"
                class="drawer-table"
                role="table"
                aria-label="Projetos do usuário"
              >
                <thead>
                  <tr class="text-left opacity-80">
                    <th class="py-2 pr-3">Código</th>
                    <th class="py-2 pr-3">Nome</th>
                    <th class="py-2 pr-3">Status</th>
                    <th class="py-2 pr-3">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="p in userProjects"
                    :key="p.id"
                    class="border-t border-white/10"
                  >
                    <td class="py-2 pr-3 font-semibold">{{ p.code }}</td>
                    <td class="py-2 pr-3">{{ p.name }}</td>
                    <td class="py-2 pr-3">
                      <span
                        class="drawer-badge"
                        :class="statusBadge(p.status)"
                        >{{ statusLabel(p.status) }}</span
                      >
                    </td>
                    <td class="py-2 pr-3 opacity-80">{{ p.role }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="py-4 opacity-70 text-center">
                Nenhum projeto vinculado.
              </p>
            </div>
          </section>

          <!-- Tasks Section -->
          <section class="grid gap-2 pt-3" aria-label="Tarefas atribuídas">
            <h3 class="font-black">Tarefas Atribuídas</h3>
            <div
              class="card p-2 overflow-auto"
              role="region"
              aria-label="Lista de tarefas do usuário"
            >
              <table
                v-if="userTasks.length"
                class="drawer-table"
                role="table"
                aria-label="Tarefas atribuídas ao usuário"
              >
                <thead>
                  <tr class="text-left opacity-80">
                    <th class="py-2 pr-3">Título</th>
                    <th class="py-2 pr-3">Status</th>
                    <th class="py-2 pr-3">Prioridade</th>
                    <th class="py-2 pr-3">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="t in userTasks"
                    :key="t.id"
                    class="border-t border-white/10"
                  >
                    <td class="py-2 pr-3 font-semibold">{{ t.title }}</td>
                    <td class="py-2 pr-3">
                      <span
                        class="drawer-badge"
                        :class="statusBadge(t.status)"
                        >{{ statusLabel(t.status) }}</span
                      >
                    </td>
                    <td class="py-2 pr-3">{{ priorityLabel(t.priority) }}</td>
                    <td class="py-2 pr-3 opacity-80">{{ fmtDate(t.dueAt) }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="py-4 opacity-70 text-center">
                Nenhuma tarefa atribuída.
              </p>
            </div>
          </section>

          <!-- Recent Activity -->
          <section class="grid gap-2 pt-3" aria-label="Atividade recente">
            <h3 class="font-black">Atividade Recente</h3>
            <div class="drawer-activity-list" v-if="userActivity.length">
              <div
                v-for="a in userActivity"
                :key="a.id"
                class="drawer-activity-item"
              >
                <span class="drawer-activity-dot"></span>
                <div class="drawer-activity-content">
                  <span class="font-semibold">{{ a.action }}</span>
                  <span class="opacity-80">{{ a.target }}</span>
                  <span class="opacity-60 text-sm">{{ a.when }}</span>
                </div>
              </div>
            </div>
            <p v-else class="py-4 opacity-70 text-center">
              Nenhuma atividade recente.
            </p>
          </section>

          <!-- Audit Events -->
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

/* Drawer expanded sections */
.drawer-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.5rem;
}

.drawer-table {
  min-width: 500px;
  width: 100%;
  border-collapse: collapse;
}

.drawer-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.drawer-badge--success {
  background: rgba(22, 163, 74, 0.14);
  color: #16a34a;
}

.drawer-badge--warn {
  background: rgba(245, 158, 11, 0.14);
  color: #f59e0b;
}

.drawer-badge--danger {
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
}

.drawer-badge--info {
  background: rgba(14, 165, 233, 0.14);
  color: #0ea5e9;
}

.drawer-badge--muted {
  background: rgba(148, 163, 184, 0.14);
  color: #94a3b8;
}

.drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.drawer-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.13);
  color: #6366f1;
  letter-spacing: 0.01em;
}

.drawer-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(120, 120, 160, 0.18);
}

.drawer-activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.5rem 0;
}

.drawer-activity-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: #6366f1;
  margin-top: 0.35rem;
}

.drawer-activity-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.8125rem;
}
</style>
