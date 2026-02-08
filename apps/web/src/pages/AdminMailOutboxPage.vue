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
  <section class="page" aria-label="Caixa de Saída Mock">
    <header class="flex flex-wrap gap-2 items-end justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-black">Caixa de Saída Mock</h1>
        <p class="opacity-70">
          Mensagens escritas pelo gateway mock (use para copiar URLs de redefinição).
        </p>
      </div>

      <div class="flex gap-2 items-center">
        <input
          class="table-search-input"
          v-model="st.q"
          name="q"
          aria-label="Buscar na caixa de saída"
          placeholder="buscar por e-mail/assunto"
          @keyup.enter="load(true)"
        />

        <select
          class="table-search-input"
          v-model="st.kind"
          name="kind"
          aria-label="Filtrar por tipo"
          @change="load(true)"
        >
          <option value="">todos</option>
          <option value="password_invite">password_invite</option>
          <option value="generic">generic</option>
        </select>

        <button
          class="btn btn-primary"
          type="button"
          aria-label="Recarregar"
          :disabled="busy"
          :aria-disabled="busy"
          @click="load(true)"
        >
          Recarregar
        </button>
      </div>
    </header>

    <div
      class="card p-2 mt-3 overflow-auto"
      role="region"
      aria-label="Tabela da caixa de saída"
    >
      <table class="min-w-[980px] w-full" role="table" aria-label="Caixa de saída">
        <thead>
          <tr class="text-left opacity-80">
            <th class="py-2 pr-3">Data</th>
            <th class="py-2 pr-3">Para</th>
            <th class="py-2 pr-3">Tipo</th>
            <th class="py-2 pr-3">Assunto</th>
            <th class="py-2 pr-3">Ações</th>
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
                aria-label="Abrir mensagem"
                @click="openRow(m)"
              >
                Abrir
              </button>
            </td>
          </tr>

          <tr v-if="!items.length && !busy">
            <td colspan="5" class="py-6 opacity-70 text-center">
              Nenhuma mensagem.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 flex justify-end">
      <button
        class="btn btn-ghost"
        type="button"
        aria-label="Carregar mais"
        :disabled="!nextCursor || busy"
        :aria-disabled="!nextCursor || busy"
        @click="more"
      >
        Carregar mais
      </button>
    </div>

    <teleport to="body">
      <div
        v-if="selectedOpen"
        class="mx-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da mensagem"
        @click.self="close"
      >
        <section class="mx-panel card" @click.stop>
          <header class="mx-head">
            <div class="grid gap-1">
              <h2 class="text-lg font-black">Mensagem</h2>
              <p class="opacity-70">
                {{ selected?.to }} · {{ selected?.subject }}
              </p>
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

          <div class="p-3 grid gap-3">
            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Texto</div>
              <pre class="card p-2 overflow-auto">{{
                selected?.text || "-"
              }}</pre>
            </div>

            <div class="grid gap-1">
              <div class="opacity-70 text-sm">Metadados</div>
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
