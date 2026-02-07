<script setup lang="ts">
import { useAuthLoginPage } from "../assets/scripts/pages/useAuthLoginPage";
const { formId, formEl, busy, email, password, submit } = useAuthLoginPage();
// formEl is used as template ref for the form element
void formEl;
</script>

<style lang="scss">
// ============================================================================
// AUTH PAGE STYLES (Login)
// ============================================================================

// Keyframe for detecting autofill (Chrome/WebKit)
@keyframes onAutoFillStart {
  from {
    /* empty */
  }
  to {
    /* empty */
  }
}

@keyframes onAutoFillCancel {
  from {
    /* empty */
  }
  to {
    /* empty */
  }
}

.auth-page {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: clamp(1rem, 4vw, 2rem);
  background: var(--surface-0);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: clamp(1.5rem, 5vw, 2.5rem);
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-2);
  text-align: left;
}

.auth-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-1);
}

.auth-brand {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.auth-brand-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
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
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // Autofill detection for Chrome/WebKit
  &:-webkit-autofill {
    animation-name: onAutoFillStart;
    // Override browser autofill colors
    -webkit-box-shadow: 0 0 0 1000px var(--surface-2) inset !important;
    -webkit-text-fill-color: var(--text-1) !important;
    caret-color: var(--text-1);
  }

  &:not(:-webkit-autofill) {
    animation-name: onAutoFillCancel;
  }
}

.auth-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
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

.auth-hint {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  color: var(--text-3);
  background: var(--surface-2);
  border-radius: var(--radius-sm, 8px);
  line-height: 1.5;
  text-align: left;
}

// Dark mode adjustments
.dark-mode {
  .auth-input {
    background: var(--surface-2);
  }
}
</style>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-label="Authentication">
      <header class="auth-header">
        <div class="auth-brand">
          <span class="auth-brand-title">Project Management CRM</span>
          <h1 class="auth-title">Sign in to your account</h1>
        </div>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="auth-form"
        aria-label="Login form"
        @submit.prevent="submit"
      >
        <label class="auth-field">
          <span class="auth-label">Email</span>
          <input
            class="auth-input"
            type="email"
            name="email"
            autocomplete="username"
            required
            v-model="email"
            placeholder="admin@corp.local"
            aria-label="Email"
          />
        </label>

        <label class="auth-field">
          <span class="auth-label">Password</span>
          <input
            class="auth-input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            v-model="password"
            placeholder="Admin#123"
            aria-label="Password"
          />
        </label>

        <div class="auth-actions">
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

        <div class="auth-hint">
          <strong>Mock users (seed):</strong> admin@corp.local / Admin#123,
          manager@corp.local / Manager#123, member@corp.local / Member#123,
          viewer@corp.local / Viewer#123
        </div>
      </form>
    </section>
  </div>
</template>
