<script setup lang="ts">
import { useAuthLoginPage } from "../assets/scripts/pages/useAuthLoginPage";
const { formId, formEl, busy, email, password, submit, passwordVisibility } =
  useAuthLoginPage();
</script>

<style lang="scss">
@import "../styles/components/auth-login";
</style>

<template>
  <div class="auth-page">
    <section class="auth-card" aria-label="Autenticação">
      <header class="auth-header">
        <div class="auth-brand">
          <span class="auth-brand-title">CRM de Gerenciamento de Projetos</span>
          <h1 class="auth-title">Entrar na sua conta</h1>
        </div>
      </header>

      <form
        ref="formEl"
        :id="formId"
        class="auth-form"
        aria-label="Formulário de login"
        @submit.prevent="submit"
      >
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

        <label class="auth-field">
          <span class="auth-label">Senha</span>
          <div class="auth-field-wrapper">
            <input
              class="auth-input auth-input-with-toggle"
              :type="passwordVisibility.inputType.value"
              name="password"
              autocomplete="current-password"
              required
              v-model="password"
              placeholder="Admin#123"
              aria-label="Senha"
            />
            <button
              type="button"
              class="auth-toggle-btn"
              :aria-label="passwordVisibility.ariaLabel.value"
              @click="passwordVisibility.toggleVisibility"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path :d="passwordVisibility.iconPath.value" />
              </svg>
            </button>
          </div>
        </label>

        <div class="auth-actions">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="busy"
            :aria-disabled="busy"
          >
            {{ busy ? "Entrando..." : "Entrar" }}
          </button>
        </div>

        <p class="auth-links">
          <RouterLink
            class="auth-link"
            to="/forgot-password"
            aria-label="Esqueceu sua senha"
          >
            Esqueceu sua senha?
          </RouterLink>
        </p>

        <div class="auth-hint">
          <strong>Usuários de teste (seed):</strong> admin@corp.local /
          Admin#123, manager@corp.local / Manager#123, member@corp.local /
          Member#123, viewer@corp.local / Viewer#123
        </div>
      </form>
    </section>
  </div>
</template>
