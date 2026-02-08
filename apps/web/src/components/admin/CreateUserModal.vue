<script setup lang="ts">
import { useCreateUserModal } from "../../assets/scripts/admin/useCreateUserModal";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "created"): void }>();

const { FORM_ID, model, busy, emailOk, canSubmit, close, submit } =
  useCreateUserModal(props, emit);
</script>

<template>
  <teleport to="body">
    <div
      v-if="open"
      class="cu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Criar usuário"
      @click.self="close"
    >
      <section ref="panelRef" class="cu-panel card" @click.stop>
        <header class="cu-head">
          <div class="grid gap-1">
            <h2 class="text-lg font-black">Criar usuário</h2>
            <p class="opacity-70">
              Cria uma conta e emite um token de convite (dev).
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

        <form
          class="cu-body grid gap-3"
          :aria-label="FORM_ID"
          @submit.prevent="submit"
        >
          <label class="grid gap-1">
            <span class="font-semibold">E-mail</span>
            <input
              class="table-search-input"
              v-model="model.email"
              name="email"
              autocomplete="off"
              aria-required="true"
              :aria-invalid="!emailOk"
              placeholder="user@corp.local"
            />
            <small class="opacity-70" v-if="!emailOk && model.email"
              >Insira um e-mail válido.</small
            >
          </label>

          <label class="grid gap-1">
            <span class="font-semibold">Perfil</span>
            <select
              class="table-search-input"
              v-model="model.roleKey"
              name="roleKey"
              aria-required="true"
            >
              <option value="viewer">Visualizador</option>
              <option value="member">Membro</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </label>

          <div class="flex gap-2 justify-end pt-1">
            <button
              class="btn btn-ghost"
              type="button"
              :disabled="busy"
              :aria-disabled="busy"
              @click="close"
            >
              Cancelar
            </button>

            <button
              class="btn btn-primary"
              type="submit"
              :disabled="!canSubmit"
              :aria-disabled="!canSubmit"
            >
              {{ busy ? "Criando..." : "Criar" }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </teleport>
</template>

<style lang="scss">
@keyframes cuFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes cuPanelIn {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.cu-body {
  padding: 0.85rem;

  input::placeholder {
    opacity: 0.75;
  }
  input:focus {
    outline: 2px solid rgba(120, 120, 200, 0.35);
    outline-offset: 2px;
  }
  input:invalid {
    box-shadow: 0 0 0 2px rgba(220, 80, 80, 0.22);
  }
  input:valid {
    box-shadow: 0 0 0 2px rgba(80, 160, 120, 0.16);
  }

  ::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.cu-head {
  align-items: start;
  border-bottom: 1px solid rgba(120, 120, 140, 0.22);
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.85rem;
}

.cu-overlay {
  animation: cuFadeIn 140ms ease both;
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  inset: 0;
  place-items: center;
  position: fixed;
  z-index: 80;
}

.cu-panel {
  animation: cuPanelIn 180ms ease both;
  container-type: inline-size;
  width: min(640px, 94vw);

  &:hover {
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  }
  &:active {
    transform: translateY(1px);
  }
}

@container (max-width: 520px) {
  .cu-body {
    padding: 0.7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cu-overlay,
  .cu-panel {
    animation: none;
  }
}

@starting-style {
  .cu-overlay {
    opacity: 0;
  }
  .cu-panel {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
}

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
