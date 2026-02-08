<script setup lang="ts">
import { useAuthForgotPasswordPage } from "../assets/scripts/pages/useAuthForgotPasswordPage";
const { formId, busy, email, submit, router } = useAuthForgotPasswordPage();
</script>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-label="Recuperação de senha">
      <header class="auth-header">
        <h1 class="auth-title">Esqueceu a senha</h1>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="auth-form"
        aria-label="Formulário de recuperação de senha"
        @submit.prevent="submit"
      >
        <p class="auth-helper" aria-live="polite">
          Digite seu e-mail. Se existir, você receberá instruções de
          redefinição.
        </p>

        <label class="auth-field">
          <span class="auth-label">E-mail</span>
          <input
            class="auth-input"
            type="email"
            name="email"
            autocomplete="username"
            required
            v-model="email"
            placeholder="admin@corp.local"
            aria-label="E-mail"
          />
        </label>

        <div class="auth-actions">
          <button
            class="btn btn-primary btn-block"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
          >
            {{ busy ? "Enviando..." : "Enviar link de redefinição" }}
          </button>

          <button
            class="btn btn-ghost btn-block"
            type="button"
            aria-label="Voltar ao login"
            @click="router.replace('/login')"
          >
            Voltar
          </button>
        </div>

        <p class="auth-links">
          <RouterLink class="auth-link" to="/login" aria-label="Ir para login">
            Voltar ao login
          </RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>

<style lang="scss">
// ============================================================================
// AUTH PAGE STYLES
// ============================================================================

.auth-page {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: clamp(1rem, 4vw, 2rem);
  background: var(--app-bg);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: clamp(1.5rem, 5vw, 2.5rem);
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-2);
}

.auth-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-1);
}

.auth-title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 700;
  color: var(--text-1);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.auth-helper {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-2);
  line-height: 1.5;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auth-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-1);
}

.auth-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-1);
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  outline: none;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &::placeholder {
    color: var(--text-muted);
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: var(--border-hover);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.auth-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px dashed color-mix(in oklab, var(--primary) 50%, transparent);
  transition:
    color 150ms ease,
    border-color 150ms ease;

  &:hover {
    color: var(--primary-hover);
    border-color: var(--primary-hover);
  }
}

// Dark mode adjustments
.dark-mode {
  .auth-input {
    background: var(--surface-2);
  }
}
</style>
