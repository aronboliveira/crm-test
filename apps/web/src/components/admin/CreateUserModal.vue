<script setup lang="ts">
import { useCreateUserModal } from "../../assets/scripts/admin/useCreateUserModal";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "created"): void }>();

const { FORM_ID, model, busy, emailOk, usernameOk, firstNameOk, lastNameOk, phoneOk, departmentOk, fieldErrors, duplicateError, canSubmit, close, submit } =
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
          <div class="cu-row">
            <label class="grid gap-1 cu-field">
              <span class="font-semibold">E-mail <span class="cu-req">*</span></span>
              <input
                class="table-search-input"
                v-model="model.email"
                name="email"
                type="email"
                autocomplete="off"
                aria-required="true"
                :aria-invalid="!emailOk && !!model.email"
                placeholder="user@corp.local"
              />
              <small class="cu-error" v-if="fieldErrors.email">{{ fieldErrors.email }}</small>
              <small class="cu-error" v-else-if="!emailOk && model.email">Insira um e-mail válido.</small>
            </label>

            <label class="grid gap-1 cu-field">
              <span class="font-semibold">Nome de Usuário <span class="cu-req">*</span></span>
              <input
                class="table-search-input"
                v-model="model.username"
                name="username"
                autocomplete="off"
                aria-required="true"
                :aria-invalid="!usernameOk && !!model.username"
                placeholder="joao.silva"
              />
              <small class="cu-error" v-if="fieldErrors.username">{{ fieldErrors.username }}</small>
              <small class="cu-hint" v-else>3–30 caracteres. Inicie com letra.</small>
            </label>
          </div>

          <div class="cu-row">
            <label class="grid gap-1 cu-field">
              <span class="font-semibold">Nome</span>
              <input
                class="table-search-input"
                v-model="model.firstName"
                name="firstName"
                autocomplete="off"
                :aria-invalid="!firstNameOk"
                placeholder="João"
              />
              <small class="cu-error" v-if="fieldErrors.firstName">{{ fieldErrors.firstName }}</small>
            </label>

            <label class="grid gap-1 cu-field">
              <span class="font-semibold">Sobrenome</span>
              <input
                class="table-search-input"
                v-model="model.lastName"
                name="lastName"
                autocomplete="off"
                :aria-invalid="!lastNameOk"
                placeholder="Silva"
              />
              <small class="cu-error" v-if="fieldErrors.lastName">{{ fieldErrors.lastName }}</small>
            </label>
          </div>

          <div class="cu-row">
            <label class="grid gap-1 cu-field">
              <span class="font-semibold">Telefone</span>
              <input
                class="table-search-input"
                v-model="model.phone"
                name="phone"
                type="tel"
                autocomplete="off"
                :aria-invalid="!phoneOk"
                placeholder="+55 (11) 99999-0000"
              />
              <small class="cu-error" v-if="fieldErrors.phone">{{ fieldErrors.phone }}</small>
            </label>

            <label class="grid gap-1 cu-field">
              <span class="font-semibold">Departamento</span>
              <input
                class="table-search-input"
                v-model="model.department"
                name="department"
                autocomplete="off"
                :aria-invalid="!departmentOk"
                placeholder="Engenharia"
              />
              <small class="cu-error" v-if="fieldErrors.department">{{ fieldErrors.department }}</small>
            </label>
          </div>

          <label class="grid gap-1">
            <span class="font-semibold">Perfil <span class="cu-req">*</span></span>
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
            <small class="cu-error" v-if="fieldErrors.roleKey">{{ fieldErrors.roleKey }}</small>
          </label>

          <p class="cu-dup-error" v-if="duplicateError">{{ duplicateError }}</p>

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
  input:focus,
  select:focus {
    outline: 2px solid rgba(120, 120, 200, 0.35);
    outline-offset: 2px;
  }
  input[aria-invalid="true"] {
    box-shadow: 0 0 0 2px rgba(220, 80, 80, 0.22);
  }

  ::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.cu-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@container (max-width: 520px) {
  .cu-row {
    grid-template-columns: 1fr;
  }
}

.cu-field {
  min-width: 0;
}

.cu-req {
  color: rgba(220, 80, 80, 0.85);
}

.cu-error {
  font-size: 0.75rem;
  font-weight: 600;
  color: #ef4444;
  margin: 0;
}

.cu-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.8;
  margin: 0;
}

.cu-dup-error {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #ef4444;
  text-align: center;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 8px;
  margin: 0;
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
