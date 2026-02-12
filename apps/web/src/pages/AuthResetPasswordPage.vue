<script setup lang="ts">
import { useAuthResetPasswordPage } from "../assets/scripts/pages/useAuthResetPasswordPage";
import PasswordChecklist from "../components/auth/PasswordChecklist.vue";

const {
  formId,
  busy,
  token,
  email,
  password,
  confirm,
  canSubmit,
  submit,
  tokenEffective,
} = useAuthResetPasswordPage();
</script>

<template>
  <div class="auth-page min-h-[100dvh] grid place-items-center p-4">
    <section
      class="auth-card card max-w-[620px] w-full"
      aria-label="Redefinir senha"
    >
      <header class="card-head">
        <h1 class="card-title">Redefinir senha</h1>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="grid gap-3"
        aria-label="Formulário de redefinição de senha"
        @submit.prevent="submit"
      >
        <p class="auth-helper" aria-live="polite">
          <span v-if="email"
            >Para: <strong>{{ email }}</strong></span
          >
          <span v-else>Forneça um token válido para redefinir sua senha.</span>
        </p>

        <label v-if="!tokenEffective" class="grid gap-1">
          <span class="font-semibold">Token</span>
          <input
            class="auth-input table-search-input"
            type="text"
            name="token"
            required
            v-model="token"
            aria-label="Token de redefinição"
            placeholder="Cole o token aqui"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Nova senha</span>
          <input
            class="auth-input table-search-input"
            type="password"
            name="password"
            autocomplete="new-password"
            required
            v-model="password"
            aria-label="Nova senha"
            placeholder="Mín. 10 caracteres com maiúscula/minúscula/número/símbolo"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Confirmar senha</span>
          <input
            class="auth-input table-search-input"
            type="password"
            name="confirm"
            autocomplete="new-password"
            required
            v-model="confirm"
            aria-label="Confirmar senha"
          />
        </label>

        <div class="auth-actions flex gap-2 justify-end">
          <RouterLink
            class="btn btn-ghost"
            to="/login"
            aria-label="Voltar ao login"
            >Voltar</RouterLink
          >
          <PasswordChecklist :password="password" :confirm="confirm" />

          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSubmit"
            :aria-disabled="!canSubmit"
          >
            {{ busy ? "Salvando..." : "Salvar senha" }}
          </button>
        </div>

        <p class="auth-links">
          <RouterLink
            class="auth-link"
            to="/forgot-password"
            aria-label="Solicitar novo link de redefinição"
          >
            Solicitar novo link de redefinição
          </RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>

<style lang="scss">
@keyframes authCardEnter {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-actions {
  align-items: center;
}

.auth-card {
  animation: authCardEnter 220ms ease both;
  container-type: inline-size;
}

.auth-helper {
  opacity: 0.8;
}

.auth-input {
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  &:enabled:hover {
    filter: brightness(1.02);
  }
  &:invalid {
    outline: 2px solid rgba(220, 80, 80, 0.35);
    outline-offset: 2px;
  }
  &:valid {
    outline: 2px solid rgba(80, 160, 120, 0.25);
    outline-offset: 2px;
  }
  &:required {
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
  }
  &::placeholder {
    opacity: 0.7;
  }
  &::selection {
    background: rgba(120, 120, 200, 0.22);
  }
}

.auth-link {
  border-bottom: 1px dashed rgba(120, 120, 160, 0.55);
  font-weight: 700;
  text-decoration: none;
  transition:
    filter 140ms ease,
    transform 140ms ease;

  &:active {
    transform: translateY(1px);
  }
  &:hover {
    filter: brightness(1.05);
  }
}

.auth-links {
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
}

@container (max-width: 520px) {
  .auth-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
    justify-content: stretch;

    > .btn {
      width: 100%;
    }
  }
}

@starting-style {
  .auth-card {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
}

</style>
