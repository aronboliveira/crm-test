<script setup lang="ts">
import { computed } from "vue";
import { useAdminUsersPage } from "../assets/scripts/pages/useAdminUsersPage";
import { usePolicyStore } from "../pinia/stores/policy.store";
import AdminUserDetailsDrawer from "../components/admin/AdminUserDetailsDrawer.vue";
import CreateUserModal from "../components/admin/CreateUserModal.vue";

const {
  createOpen,
  openCreate,
  closeCreate,
  can,
  st,
  rows,
  busy,
  nextCursor,
  drawerOpen,
  drawerUserId,
  openDrawer,
  closeDrawer,
  load,
  setRole,
  forceReset,
} = useAdminUsersPage();

const policy = usePolicyStore();
const isAdmin = computed(() => policy.can("admin.full"));

const roleLabels: Record<string, string> = {
  viewer: "Visualizador",
  member: "Membro",
  manager: "Gerente",
  admin: "Administrador",
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const displayName = (u: any): string => {
  if (u.name) return u.name;
  if (u.firstName || u.lastName)
    return [u.firstName, u.lastName].filter(Boolean).join(" ");
  const local = (u.email || "").split("@")[0] || "";
  return local.charAt(0).toUpperCase() + local.slice(1);
};
</script>

<template>
  <div v-if="can" class="p-4 grid gap-3" aria-label="Gerenciamento de usuários">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Usuários</h1>
        <p class="opacity-70">
          Gerenciamento de usuários (somente administradores).
        </p>
      </div>

      <div class="grid gap-2" style="min-width: min(520px, 100%)">
        <div class="grid gap-2" style="grid-template-columns: 1fr 180px">
          <label class="grid gap-1">
            <span class="font-semibold">Buscar</span>
            <input
              class="table-search-input"
              v-model="st.q"
              name="q"
              autocomplete="off"
              aria-label="Buscar por e-mail"
              placeholder="e-mail contém..."
              @keyup.enter="load(true)"
            />
          </label>

          <label class="grid gap-1">
            <span class="font-semibold">Perfil</span>
            <select
              class="table-search-input"
              v-model="st.roleKey"
              aria-label="Filtrar por perfil"
              @change="load(true)"
            >
              <option value="">Todos</option>
              <option value="viewer">Visualizador</option>
              <option value="member">Membro</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="busy"
            :aria-disabled="busy"
            @click="load(true)"
          >
            Atualizar
          </button>
        </div>
      </div>
    </header>

    <div
      class="card p-3 overflow-auto"
      role="region"
      aria-label="Tabela de usuários"
    >
      <table
        class="min-w-[920px] w-full"
        role="table"
        aria-label="Lista de usuários"
      >
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Nome</th>
            <th class="py-2 pr-3">E-mail</th>
            <th class="py-2 pr-3">Perfil</th>
            <th v-if="isAdmin" class="py-2 pr-3">Token v.</th>
            <th v-if="isAdmin" class="py-2 pr-3">Senha atualizada</th>
            <th class="py-2 pr-3">Criado em</th>
            <th class="py-2 pr-3">Ações</th>
            <th class="py-2 pr-3">Bloqueado</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="u in rows" :key="u.id" class="border-t border-white/10">
            <td class="py-2 pr-3 font-semibold">{{ displayName(u) }}</td>
            <td class="py-2 pr-3">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                aria-label="Abrir detalhes do usuário"
                @click="openDrawer(u)"
              >
                {{ u.email }}
              </button>
            </td>
            <td class="py-2 pr-3">
              <span
                class="admin-role-badge"
                :class="'admin-role-badge--' + (u.roleKey || 'viewer')"
              >
                {{ roleLabels[u.roleKey] || u.roleKey || "—" }}
              </span>
            </td>
            <td v-if="isAdmin" class="py-2 pr-3">{{ u.tokenVersion }}</td>
            <td v-if="isAdmin" class="py-2 pr-3">
              {{ fmtDate(u.passwordUpdatedAt) }}
            </td>
            <td class="py-2 pr-3">{{ fmtDate(u.createdAt) }}</td>
            <td class="py-2 pr-3">
              <div class="flex gap-2">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Alterar perfil"
                  @click="setRole(u)"
                >
                  Perfil
                </button>

                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Forçar redefinição"
                  @click="forceReset(u)"
                >
                  Redefinir
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  aria-label="Ver detalhes"
                  @click="openDrawer(u)"
                >
                  Ver
                </button>
              </div>
            </td>
            <td class="py-2 pr-3">{{ u.lockedAt ? "Sim" : "Não" }}</td>
          </tr>

          <tr v-if="!rows.length && !busy">
            <td :colspan="isAdmin ? 8 : 6" class="py-6 opacity-70 text-center">
              Nenhum usuário encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex gap-2 justify-end">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy || !nextCursor"
        :aria-disabled="busy || !nextCursor"
        @click="load(false)"
      >
        Carregar mais
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy"
        :aria-disabled="busy"
        @click="openCreate"
      >
        Criar usuário
      </button>
    </div>
    <AdminUserDetailsDrawer
      :open="drawerOpen"
      :userId="drawerUserId"
      @close="closeDrawer"
      @updated="load(true)"
    />
    <CreateUserModal
      :open="createOpen"
      @close="closeCreate"
      @created="load(true)"
    />
  </div>

  <div v-else class="p-6 opacity-70" aria-label="Acesso negado">
    Você não tem permissão para acessar esta página.
  </div>
</template>

<style scoped lang="scss">
.admin-role-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: capitalize;
}

.admin-role-badge--viewer {
  background: var(--surface-3, #e2e8f0);
  color: var(--text-2, #475569);
}

.admin-role-badge--member {
  background: var(--info-soft, #dbeafe);
  color: var(--info, #2563eb);
}

.admin-role-badge--manager {
  background: var(--warning-soft, #fef3c7);
  color: var(--warning, #d97706);
}

.admin-role-badge--admin {
  background: var(--danger-soft, #fee2e2);
  color: var(--danger, #dc2626);
}
</style>
