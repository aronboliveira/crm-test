<script setup lang="ts">
import { useAuthForgotPasswordPage } from "../assets/scripts/pages/useAuthForgotPasswordPage";
const { formId, busy, email, submit, router } = useAuthForgotPasswordPage();
</script>

<template>
  <div class="auth-page min-h-[100dvh] grid place-items-center p-4">
    <section
      class="auth-card card max-w-[560px] w-full"
      aria-label="Password recovery"
    >
      <header class="card-head">
        <h1 class="card-title">Forgot password</h1>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="grid gap-3"
        aria-label="Forgot password form"
        @submit.prevent="submit"
      >
        <p class="auth-helper" aria-live="polite">
          Enter your email. If it exists, you will receive reset instructions.
        </p>

        <label class="grid gap-1">
          <span class="font-semibold">Email</span>
          <input
            class="auth-input table-search-input"
            type="email"
            name="email"
            autocomplete="username"
            required
            v-model="email"
            placeholder="admin@corp.local"
            aria-label="Email"
          />
        </label>

        <div class="auth-actions flex gap-2 justify-end">
          <button
            class="btn btn-ghost"
            type="button"
            aria-label="Back to login"
            @click="router.replace('/login')"
          >
            Back
          </button>

          <button
            class="btn btn-primary"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
          >
            {{ busy ? "Sending..." : "Send reset link" }}
          </button>
        </div>

        <p class="auth-links">
          <RouterLink class="auth-link" to="/login" aria-label="Go to login">
            Return to login
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

.dark-mode {
  .auth-link {
    border-bottom-color: rgba(170, 170, 210, 0.45);
  }
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

@supports (position-try: flip-block) {
  @position-try flip-block;
}
</style>
