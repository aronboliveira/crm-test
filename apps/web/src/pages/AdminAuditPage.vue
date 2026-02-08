<script setup lang="ts">
import { useAdminAuditPage } from "../assets/scripts/pages/useAdminAuditPage";
const { can, st, rows, busy, nextCursor, load } = useAdminAuditPage();
</script>

<template>
  <div v-if="can" class="p-4 grid gap-3" aria-label="Auditoria">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Auditoria</h1>
        <p class="opacity-70">Eventos de autenticação e administração.</p>
      </div>

      <div class="grid gap-2" style="min-width: min(640px, 100%)">
        <div class="grid gap-2" style="grid-template-columns: 1fr 300px">
          <label class="grid gap-1">
            <span class="font-semibold">Buscar</span>
            <input
              class="table-search-input"
              v-model="st.q"
              name="q"
              autocomplete="off"
              aria-label="Buscar por e-mail"
              placeholder="e-mail completo (exato) ou fragmento mascarado (ex.: ad***@c***)"
              @keyup.enter="load(true)"
            />
          </label>

          <label class="grid gap-1">
            <span class="font-semibold">Tipo</span>
            <select
              class="table-search-input"
              v-model="st.kind"
              aria-label="Filtrar por tipo"
              @change="load(true)"
            >
              <option value="">Todos</option>
              <option value="auth.login.success">auth.login.success</option>
              <option value="auth.login.failure">auth.login.failure</option>
              <option value="auth.password_reset.requested">
                auth.password_reset.requested
              </option>
              <option value="auth.password_reset.completed">
                auth.password_reset.completed
              </option>
              <option value="admin.user.role_changed">
                admin.user.role_changed
              </option>
              <option value="admin.user.force_reset">
                admin.user.force_reset
              </option>
              <option value="admin.user.locked">admin.user.locked</option>
              <option value="admin.user.unlocked">admin.user.unlocked</option>
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
      aria-label="Tabela de auditoria"
    >
      <table
        class="min-w-[1060px] w-full"
        role="table"
        aria-label="Lista de eventos de auditoria"
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
          <tr v-for="e in rows" :key="e._id" class="border-t border-white/10">
            <td class="py-2 pr-3">{{ e.createdAt }}</td>
            <td class="py-2 pr-3 font-semibold">{{ e.kind }}</td>
            <td class="py-2 pr-3">
              {{ e.actorEmailMasked || e.actorEmail || "-" }}
            </td>
            <td class="py-2 pr-3">
              {{ e.targetEmailMasked || e.targetEmail || "-" }}
            </td>
            <td class="py-2 pr-3">{{ e.targetEmail || "-" }}</td>
            <td class="py-2 pr-3">
              <code class="opacity-80" style="word-break: break-word">{{
                e.meta ? JSON.stringify(e.meta) : "-"
              }}</code>
            </td>
          </tr>

          <tr v-if="!rows.length && !busy">
            <td colspan="5" class="py-6 opacity-70 text-center">
              Nenhum evento.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy || !nextCursor"
        :aria-disabled="busy || !nextCursor"
        @click="load(false)"
      >
        Carregar mais
      </button>
    </div>
  </div>

  <div v-else class="p-6 opacity-70" aria-label="Acesso negado">
    Acesso negado.
  </div>
</template>
