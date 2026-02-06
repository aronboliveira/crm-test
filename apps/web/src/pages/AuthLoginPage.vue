<script setup lang="ts">
import { useAuthLoginPage } from "../assets/scripts/pages/useAuthLoginPage";
const { formId, busy, email, password, submit } = useAuthLoginPage();
</script>

<style lang="scss">
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

  &::selection {
    background: rgba(120, 120, 200, 0.22);
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
</style>

<template>
  <div class="min-h-[100dvh] grid place-items-center p-4">
    <section class="card max-w-[520px] w-full" aria-label="Authentication">
      <header class="card-head">
        <h1 class="card-title">Sign in</h1>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="grid gap-3"
        aria-label="Login form"
        @submit.prevent="submit"
      >
        <label class="grid gap-1">
          <span class="font-semibold">Email</span>
          <input
            class="table-search-input"
            type="email"
            name="email"
            autocomplete="username"
            required
            v-model="email"
            placeholder="admin@corp.local"
            aria-label="Email"
          />
        </label>

        <label class="grid gap-1">
          <span class="font-semibold">Password</span>
          <input
            class="table-search-input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            v-model="password"
            placeholder="Admin#123"
            aria-label="Password"
          />
        </label>

        <div class="flex gap-2 justify-end">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
          >
            {{ busy ? "Signing in..." : "Sign in" }}
          </button>
        </div>
        <p class="auth-links">
          <RouterLink
            class="auth-link"
            to="/forgot-password"
            aria-label="Forgot your password"
          >
            Forgot your password?
          </RouterLink>
        </p>

        <div class="opacity-75 text-sm">
          Mock users (seed): admin@corp.local / Admin#123, manager@corp.local /
          Manager#123, member@corp.local / Member#123, viewer@corp.local /
          Viewer#123
        </div>
      </form>
    </section>
  </div>
</template>
